"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { askAboutComment, sendReview, setCommentStatus } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";
import { FormMessage } from "./FormMessage";

type Message = { id: string; role: string; content: string };
export type ReviewComment = {
  id: string;
  quote: string;
  startOffset: number;
  endOffset: number;
  severity: string;
  category: string;
  title: string;
  explanation: string;
  suggestion: string;
  relatedSource: string;
  status: string;
  messages: Message[];
};
type Review = { id: string; status: string; summary: string; error: string; sentTo: string; name: string; text: string };

const CATEGORY: Record<string, string> = {
  direct_conflict: "Direct conflict",
  indirect_risk: "Indirect risk",
  future_risk: "Future risk",
  goal_misalignment: "Goal misalignment",
};

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-neutral-900",
  medium: "bg-neutral-500",
  low: "bg-neutral-300",
};

function highlightClass(c: ReviewComment, active: boolean) {
  if (active) return "bg-neutral-900 text-white";
  if (c.status === "accepted") return "bg-emerald-100 decoration-emerald-600";
  if (c.status === "rejected") return "bg-neutral-100 text-neutral-400 line-through decoration-neutral-400";
  return c.severity === "high" ? "bg-amber-200/70" : c.severity === "medium" ? "bg-amber-100" : "bg-neutral-200/70";
}

export function ReviewWorkspace({ review, comments }: { review: Review; comments: ReviewComment[] }) {
  const [index, setIndex] = useState(() => Math.max(0, comments.findIndex((c) => c.status === "pending")));
  const [chatOpen, setChatOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const marks = useRef<Record<string, HTMLElement | null>>({});
  const current = comments[index];
  const resolved = comments.filter((c) => c.status !== "pending").length;
  const allDone = comments.length > 0 ? resolved === comments.length : review.status !== "failed";

  useEffect(() => {
    if (current) marks.current[current.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight" || e.key === "j") setIndex((i) => Math.min(comments.length - 1, i + 1));
      if (e.key === "ArrowLeft" || e.key === "k") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [comments.length]);

  const segments = useMemo(() => {
    const out: { text: string; comment?: ReviewComment; n?: number }[] = [];
    let pos = 0;
    comments.forEach((c, n) => {
      if (c.startOffset < pos) return;
      if (c.startOffset > pos) out.push({ text: review.text.slice(pos, c.startOffset) });
      out.push({ text: review.text.slice(c.startOffset, c.endOffset), comment: c, n });
      pos = c.endOffset;
    });
    out.push({ text: review.text.slice(pos) });
    return out;
  }, [comments, review.text]);

  function decide(status: "accepted" | "rejected") {
    if (!current) return;
    const next = current.status === status ? "pending" : status;
    startTransition(async () => {
      await setCommentStatus(current.id, next);
      if (next !== "pending") {
        const after = comments.findIndex((c, i) => i > index && c.status === "pending");
        if (after >= 0) setIndex(after);
      }
    });
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-6 border-b border-neutral-200 px-8 py-4">
        <div className="min-w-0">
          <Link href="/reviews" className="text-xs text-neutral-500 hover:text-neutral-900">← Reviews</Link>
          <h1 className="truncate font-serif text-xl font-semibold">{review.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-neutral-500">
            <div>{resolved} of {comments.length} reviewed</div>
            <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full bg-neutral-900 transition-all" style={{ width: `${comments.length ? (resolved / comments.length) * 100 : 100}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <article className="min-w-0 flex-1 overflow-y-auto bg-neutral-50 px-8 py-10">
          <div className="mx-auto max-w-3xl rounded-sm border border-neutral-200 bg-white px-14 py-16 shadow-sm">
            <div className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-neutral-800">
              {segments.map((s, i) =>
                s.comment ? (
                  <mark
                    key={i}
                    ref={(el) => {
                      marks.current[s.comment!.id] = el;
                    }}
                    onClick={() => setIndex(s.n!)}
                    className={`cursor-pointer rounded-sm px-0.5 transition ${highlightClass(s.comment, s.n === index)}`}
                  >
                    <sup className="mr-0.5 font-sans text-[10px] font-semibold">{s.n! + 1}</sup>
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          </div>
        </article>

        <aside className="flex w-[420px] shrink-0 flex-col border-l border-neutral-200 bg-white">
          {review.status === "failed" ? (
            <div className="p-6">
              <h2 className="font-medium">Analysis failed</h2>
              <p className="mt-2 text-sm text-neutral-600">{review.error}</p>
            </div>
          ) : (
            <>
              {review.summary && (
                <div className="border-b border-neutral-200 p-6">
                  <h2 className="label">Assessment</h2>
                  <p className="text-sm leading-relaxed text-neutral-700">{review.summary}</p>
                </div>
              )}

              {current ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
                    <button className="btn-ghost px-2.5 py-1" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous comment">←</button>
                    <span className="text-xs text-neutral-500">Comment {index + 1} / {comments.length}</span>
                    <button className="btn-ghost px-2.5 py-1" disabled={index === comments.length - 1} onClick={() => setIndex(index + 1)} aria-label="Next comment">→</button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[current.severity] ?? "bg-neutral-400"}`} />
                      <span className="capitalize">{current.severity}</span>
                      <span>·</span>
                      <span>{CATEGORY[current.category] ?? current.category}</span>
                      {current.status !== "pending" && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 capitalize ${current.status === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {current.status}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-serif text-lg font-semibold leading-snug">{current.title}</h3>
                    <blockquote className="mt-4 border-l-2 border-neutral-900 pl-3 font-serif text-sm italic text-neutral-600">“{current.quote}”</blockquote>
                    <p className="mt-4 text-sm leading-relaxed text-neutral-700">{current.explanation}</p>
                    {current.relatedSource && (
                      <p className="mt-3 text-xs text-neutral-500"><span className="font-medium text-neutral-700">Related: </span>{current.relatedSource}</p>
                    )}
                    {current.suggestion && (
                      <div className="mt-5 rounded-md bg-neutral-50 p-4">
                        <div className="label">Suggested change</div>
                        <p className="text-sm leading-relaxed text-neutral-800">{current.suggestion}</p>
                      </div>
                    )}
                    {chatOpen && <Chat key={current.id} comment={current} />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-neutral-200 p-4">
                    <button
                      onClick={() => decide("accepted")}
                      disabled={pending || review.status === "sent"}
                      className={`btn ${current.status === "accepted" ? "bg-emerald-700 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => decide("rejected")}
                      disabled={pending || review.status === "sent"}
                      className={`btn ${current.status === "rejected" ? "bg-red-700 text-white" : "bg-red-600 text-white hover:bg-red-700"}`}
                    >
                      ✕ Reject
                    </button>
                    <button onClick={() => setChatOpen((o) => !o)} className={chatOpen ? "btn-primary" : "btn-ghost"}>
                      Ask AI
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 text-sm text-neutral-500">No issues were found in this contract.</div>
              )}

              {allDone && <SendPanel review={review} />}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Chat({ comment }: { comment: ReviewComment }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [comment.messages.length, optimistic]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    setDraft("");
    setError("");
    setOptimistic(q);
    startTransition(async () => {
      const res = await askAboutComment(comment.id, q);
      if (res?.error) setError(res.error);
      setOptimistic(null);
    });
  }

  return (
    <div className="mt-6 border-t border-neutral-200 pt-5">
      <div className="label">Discuss with AI</div>
      <div className="space-y-3">
        {comment.messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
        {optimistic && <Bubble role="user" content={optimistic} />}
        {pending && <div className="text-xs text-neutral-400">Mistral is thinking…</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. What would a fair cap look like?" />
        <button className="btn-primary" disabled={pending || !draft.trim()}>Send</button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  return (
    <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${role === "user" ? "ml-8 bg-neutral-900 text-white" : "mr-8 bg-neutral-100 text-neutral-800"}`}>
      {content}
    </div>
  );
}

function SendPanel({ review }: { review: Review }) {
  const [state, action] = useActionState(sendReview, undefined);
  if (review.status === "sent" && !state)
    return <div className="border-t border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">Sent to <span className="font-medium text-neutral-900">{review.sentTo}</span>.</div>;
  return (
    <form action={action} className="space-y-3 border-t border-neutral-200 bg-neutral-50 p-6">
      <div className="text-sm font-medium">Review complete — send it</div>
      <input type="hidden" name="reviewId" value={review.id} />
      <input className="input" name="to" type="email" required placeholder="counterparty@company.com" />
      <textarea className="input min-h-16" name="note" placeholder="Optional message" />
      <SubmitButton className="btn-primary w-full" pendingText="Sending…">Send by email</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
