import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { ReviewWorkspace } from "@/components/ReviewWorkspace";

export default async function ReviewPage(props: PageProps<"/reviews/[id]">) {
  const { id } = await props.params;
  const company = await requireCompany();
  const review = await db.review.findFirst({
    where: { id, companyId: company.id },
    include: {
      document: true,
      comments: { orderBy: { position: "asc" }, include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!review) notFound();
  return (
    <ReviewWorkspace
      review={{
        id: review.id,
        status: review.status,
        summary: review.summary,
        error: review.error,
        sentTo: review.sentTo,
        name: review.document.name,
        text: review.document.text,
      }}
      comments={review.comments.map((c) => ({
        id: c.id,
        quote: c.quote,
        startOffset: c.startOffset,
        endOffset: c.endOffset,
        severity: c.severity,
        category: c.category,
        title: c.title,
        explanation: c.explanation,
        suggestion: c.suggestion,
        relatedSource: c.relatedSource,
        status: c.status,
        messages: c.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
      }))}
    />
  );
}
