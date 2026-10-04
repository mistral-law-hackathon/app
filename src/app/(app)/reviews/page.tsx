import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { UploadForm } from "@/components/UploadForm";

export default async function ReviewsPage() {
  const company = await requireCompany();
  const [reviews, existing] = await Promise.all([
    db.review.findMany({
      where: { companyId: company.id },
      include: { document: true, comments: { select: { status: true, severity: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.document.count({ where: { companyId: company.id, kind: "existing" } }),
  ]);
  return (
    <>
      <PageHeader title="Reviews" subtitle={`Upload a proposed contract. It will be checked against your profile and ${existing} existing contract${existing === 1 ? "" : "s"}.`} />
      <div className="space-y-8 px-10 py-8">
        <UploadForm mode="review" />
        <div className="card divide-y divide-neutral-200">
          {reviews.length === 0 && <p className="p-6 text-sm text-neutral-500">No reviews yet.</p>}
          {reviews.map((r) => {
            const done = r.comments.filter((c) => c.status !== "pending").length;
            const high = r.comments.filter((c) => c.severity === "high").length;
            return (
              <Link key={r.id} href={`/reviews/${r.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50">
                <div>
                  <div className="text-sm font-medium">{r.document.name}</div>
                  <div className="text-xs text-neutral-500">{r.createdAt.toLocaleString("en-GB")}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  {high > 0 && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-white">{high} high</span>}
                  <span>{done}/{r.comments.length} resolved</span>
                  <span className="rounded-full border border-neutral-300 px-2 py-0.5 capitalize">{r.status}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
