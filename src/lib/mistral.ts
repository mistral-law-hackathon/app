import "server-only";
import OpenAI from "openai";
import mammoth from "mammoth";

// The provider is OpenAI; the key is intentionally read from MISTRAL_API_KEY.
const client = new OpenAI({ apiKey: process.env.MISTRAL_API_KEY ?? "", maxRetries: 4 });
const MODEL = process.env.MISTRAL_MODEL ?? "gpt-4.1";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function complete(messages: Msg[], schema?: { name: string; schema: Record<string, unknown> }) {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages,
    response_format: schema
      ? { type: "json_schema", json_schema: { name: schema.name, schema: schema.schema, strict: true } }
      : undefined,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function extractText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return buf.toString("utf8");
  }
  if (name.endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  const mime = file.type || (name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Transcribe the full text of the document verbatim, preserving headings and clause numbering. Output only the text.",
      },
      {
        role: "user",
        content: [
          mime.startsWith("image/")
            ? { type: "image_url", image_url: { url: dataUrl } }
            : { type: "file", file: { filename: file.name, file_data: dataUrl } },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function summarizeDocument(text: string) {
  return complete([
    {
      role: "system",
      content:
        "You are a contracts analyst. Summarize the contract in at most 6 bullet points: parties, term, key obligations, exclusivity / non-compete, liability, termination. Plain text bullets starting with '- '.",
    },
    { role: "user", content: text.slice(0, 40000) },
  ]);
}

export type CompanyContext = {
  name: string;
  industry: string;
  jurisdiction: string;
  description: string;
  goals: string;
  activities: string;
  revenue: string;
  structure: string;
  risks: string;
};

export type RawFinding = {
  quote: string;
  severity: "high" | "medium" | "low";
  category: "direct_conflict" | "indirect_risk" | "future_risk" | "goal_misalignment";
  title: string;
  explanation: string;
  suggestion: string;
  relatedSource: string;
};

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "findings"],
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "severity", "category", "title", "explanation", "suggestion", "relatedSource"],
        properties: {
          quote: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          category: {
            type: "string",
            enum: ["direct_conflict", "indirect_risk", "future_risk", "goal_misalignment"],
          },
          title: { type: "string" },
          explanation: { type: "string" },
          suggestion: { type: "string" },
          relatedSource: { type: "string" },
        },
      },
    },
  },
};

function companyBlock(c: CompanyContext) {
  return Object.entries(c)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

export async function reviewContract(input: {
  company: CompanyContext;
  existing: { name: string; text: string }[];
  contract: { name: string; text: string };
}): Promise<{ summary: string; findings: RawFinding[] }> {
  const perDoc = Math.max(4000, Math.floor(60000 / Math.max(1, input.existing.length)));
  const existing = input.existing
    .map((d) => `### ${d.name}\n${d.text.slice(0, perDoc)}`)
    .join("\n\n");

  const raw = await complete(
    [
      {
        role: "system",
        content: `You are a senior corporate lawyer reviewing a NEW contract on behalf of the company described below.
Identify every clause in the NEW contract that:
- directly conflicts with a clause in one of the company's EXISTING contracts (direct_conflict),
- does not conflict today but indirectly harms the company's interests (indirect_risk),
- is likely to cause conflict in the future given the company's goals, activities, revenues or structure (future_risk),
- is misaligned with the company's stated goals (goal_misalignment).

Rules:
- "quote" MUST be copied verbatim from the NEW contract (an exact contiguous substring, 5-60 words). Never paraphrase it.
- "relatedSource" names the existing contract and clause, or the company profile field, that the issue relates to. Empty string if none.
- "suggestion" is concrete redline language or a negotiation position.
- Order findings by their position in the NEW contract. Only report material issues; do not invent conflicts.
- "summary" is a 2-4 sentence overall assessment.`,
      },
      {
        role: "user",
        content: `## COMPANY PROFILE\n${companyBlock(input.company)}\n\n## EXISTING CONTRACTS\n${existing || "(none)"}\n\n## NEW CONTRACT: ${input.contract.name}\n${input.contract.text}`,
      },
    ],
    { name: "contract_review", schema: reviewSchema },
  );
  const parsed = JSON.parse(raw) as { summary: string; findings: RawFinding[] };
  return { summary: parsed.summary ?? "", findings: parsed.findings ?? [] };
}

export async function discussFinding(input: {
  company: CompanyContext;
  contractText: string;
  finding: { quote: string; title: string; explanation: string; suggestion: string };
  history: { role: string; content: string }[];
}) {
  return complete([
    {
      role: "system",
      content: `You are a senior corporate lawyer helping ${input.company.name} negotiate a contract. Answer concisely and practically about the flagged clause. Use plain language.

Company profile:
${companyBlock(input.company)}

Flagged clause: "${input.finding.quote}"
Issue: ${input.finding.title} - ${input.finding.explanation}
Suggested fix: ${input.finding.suggestion}

Full contract (for context):
${input.contractText.slice(0, 30000)}`,
    },
    ...input.history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as Msg["role"],
      content: m.content,
    })),
  ]);
}
