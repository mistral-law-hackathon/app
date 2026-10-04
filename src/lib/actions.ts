"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "./db";
import { createSession, destroySession, requireCompany } from "./auth";
import { extractText, reviewContract, summarizeDocument, discussFinding, type CompanyContext } from "./mistral";
import { locateQuote } from "./anchor";
import { sendMail } from "./mail";

export type FormState = { error?: string; ok?: string } | undefined;

const credentials = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!name) return { error: "Company name is required" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();
  if (await db.company.findUnique({ where: { email } })) return { error: "An account with this email already exists" };
  const company = await db.company.create({
    data: { name, email, passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });
  await createSession(company.id);
  redirect("/company");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Invalid email or password" };
  const company = await db.company.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!company || !(await bcrypt.compare(parsed.data.password, company.passwordHash)))
    return { error: "Invalid email or password" };
  await createSession(company.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

const PROFILE_FIELDS = ["name", "industry", "jurisdiction", "description", "goals", "activities", "revenue", "structure", "risks"] as const;

export async function updateCompany(_: FormState, form: FormData): Promise<FormState> {
  const company = await requireCompany();
  const data = Object.fromEntries(PROFILE_FIELDS.map((f) => [f, String(form.get(f) ?? "").trim()]));
  if (!data.name) return { error: "Company name is required" };
  await db.company.update({ where: { id: company.id }, data });
  revalidatePath("/", "layout");
  return { ok: "Profile saved" };
}

function toContext(c: Record<(typeof PROFILE_FIELDS)[number], string>): CompanyContext {
  return Object.fromEntries(PROFILE_FIELDS.map((f) => [f, c[f]])) as CompanyContext;
}

const MAX_BYTES = 15 * 1024 * 1024;

export async function uploadDocuments(_: FormState, form: FormData): Promise<FormState> {
  const company = await requireCompany();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one file" };
  const errors: string[] = [];
  let added = 0;
  const queue = [...files];
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      try {
        if (file.size > MAX_BYTES) throw new Error("larger than 15 MB");
        const text = await extractText(file);
        if (!text.trim()) throw new Error("no text found");
        const summary = await summarizeDocument(text).catch(() => "");
        await db.document.create({
          data: { companyId: company.id, name: file.name, mimeType: file.type, text, summary, kind: "existing" },
        });
        added++;
      } catch (e) {
        errors.push(`${file.name}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
  revalidatePath("/documents");
  const ok = `${added} document${added === 1 ? "" : "s"} added`;
  if (errors.length) return { error: `${ok}. Failed: ${errors.join("; ")}` };
  return { ok };
}

export async function deleteDocument(form: FormData) {
  const company = await requireCompany();
  await db.document.deleteMany({ where: { id: String(form.get("id")), companyId: company.id } });
  revalidatePath("/documents");
}

export async function startReview(_: FormState, form: FormData): Promise<FormState> {
  const company = await requireCompany();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose the contract to review" };
  if (file.size > MAX_BYTES) return { error: "File is larger than 15 MB" };
  let text: string;
  try {
    text = await extractText(file);
  } catch (e) {
    return { error: `Could not read the file: ${(e as Error).message}` };
  }
  if (!text.trim()) return { error: "No text found in this file" };

  const doc = await db.document.create({
    data: { companyId: company.id, name: file.name, mimeType: file.type, text, kind: "incoming" },
  });
  const review = await db.review.create({ data: { companyId: company.id, documentId: doc.id } });

  const existing = await db.document.findMany({
    where: { companyId: company.id, kind: "existing" },
    select: { name: true, text: true },
  });

  try {
    const result = await reviewContract({ company: toContext(company), existing, contract: { name: doc.name, text } });
    let cursor = 0;
    const located = result.findings
      .map((f) => ({ f, range: locateQuote(text, f.quote, cursor) }))
      .filter((x): x is { f: typeof x.f; range: [number, number] } => x.range !== null)
      .sort((a, b) => a.range[0] - b.range[0]);
    await db.$transaction([
      ...located.map(({ f, range }, i) => {
        cursor = range[1];
        return db.comment.create({
          data: {
            reviewId: review.id,
            position: i,
            quote: text.slice(range[0], range[1]),
            startOffset: range[0],
            endOffset: range[1],
            severity: f.severity,
            category: f.category,
            title: f.title,
            explanation: f.explanation,
            suggestion: f.suggestion,
            relatedSource: f.relatedSource,
          },
        });
      }),
      db.review.update({ where: { id: review.id }, data: { status: "ready", summary: result.summary } }),
    ]);
  } catch (e) {
    await db.review.update({ where: { id: review.id }, data: { status: "failed", error: (e as Error).message } });
  }
  redirect(`/reviews/${review.id}`);
}

async function ownedComment(commentId: string) {
  const company = await requireCompany();
  const comment = await db.comment.findFirst({
    where: { id: commentId, review: { companyId: company.id } },
    include: { review: { include: { document: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!comment) throw new Error("Not found");
  return { company, comment };
}

export async function setCommentStatus(commentId: string, status: "accepted" | "rejected" | "pending") {
  const { comment } = await ownedComment(commentId);
  await db.comment.update({ where: { id: comment.id }, data: { status } });
  revalidatePath(`/reviews/${comment.reviewId}`);
}

export async function askAboutComment(commentId: string, question: string) {
  const { company, comment } = await ownedComment(commentId);
  const q = question.trim();
  if (!q) return { error: "Empty message" };
  await db.chatMessage.create({ data: { commentId, role: "user", content: q } });
  const history = [...comment.messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: q }];
  try {
    const answer = await discussFinding({
      company: toContext(company),
      contractText: comment.review.document.text,
      finding: comment,
      history,
    });
    await db.chatMessage.create({ data: { commentId, role: "assistant", content: answer } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/reviews/${comment.reviewId}`);
  return {};
}

const LABEL: Record<string, string> = {
  direct_conflict: "Direct conflict",
  indirect_risk: "Indirect risk",
  future_risk: "Future risk",
  goal_misalignment: "Goal misalignment",
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendReview(_: FormState, form: FormData): Promise<FormState> {
  const company = await requireCompany();
  const reviewId = String(form.get("reviewId"));
  const to = String(form.get("to") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  if (!z.string().email().safeParse(to).success) return { error: "Enter a valid email address" };
  const review = await db.review.findFirst({
    where: { id: reviewId, companyId: company.id },
    include: { document: true, comments: { orderBy: { position: "asc" } } },
  });
  if (!review) return { error: "Review not found" };
  if (review.comments.some((c) => c.status === "pending")) return { error: "Resolve every comment before sending" };

  const accepted = review.comments.filter((c) => c.status === "accepted");
  const subject = `Contract review: ${review.document.name} — ${company.name}`;
  const text = [
    `${company.name} has reviewed "${review.document.name}".`,
    note && `\n${note}`,
    `\nRequested changes (${accepted.length}):`,
    ...accepted.map((c, i) => `\n${i + 1}. ${c.title}\n   Clause: "${c.quote}"\n   Issue: ${c.explanation}\n   Proposed change: ${c.suggestion}`),
  ]
    .filter(Boolean)
    .join("\n");
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#111;max-width:640px">
<p><strong>${esc(company.name)}</strong> has reviewed <strong>${esc(review.document.name)}</strong>.</p>
${note ? `<p>${esc(note).replace(/\n/g, "<br>")}</p>` : ""}
<h3 style="margin-top:24px">Requested changes (${accepted.length})</h3>
${accepted
  .map(
    (c, i) => `<div style="border-left:3px solid #111;padding:4px 12px;margin:16px 0">
<div style="font-weight:600">${i + 1}. ${esc(c.title)} <span style="color:#666;font-weight:400">· ${LABEL[c.category] ?? c.category}</span></div>
<div style="color:#555;font-style:italic;margin:6px 0">“${esc(c.quote)}”</div>
<div>${esc(c.explanation)}</div>
${c.suggestion ? `<div style="margin-top:6px"><strong>Proposed change:</strong> ${esc(c.suggestion)}</div>` : ""}
</div>`,
  )
  .join("")}
</div>`;

  try {
    const { previewUrl } = await sendMail({
      to,
      subject,
      text,
      html,
      attachments: [{ filename: review.document.name.replace(/\.[^.]+$/, "") + ".txt", content: review.document.text }],
    });
    await db.review.update({ where: { id: review.id }, data: { status: "sent", sentTo: to, sentAt: new Date() } });
    revalidatePath(`/reviews/${review.id}`);
    return { ok: previewUrl ? `Sent (test inbox): ${previewUrl}` : `Sent to ${to}` };
  } catch (e) {
    return { error: `Email failed: ${(e as Error).message}` };
  }
}
