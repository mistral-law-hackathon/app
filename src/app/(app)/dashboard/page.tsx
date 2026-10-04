import Link from "next/link";
import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";

export default async function Dashboard() {
  const company = await requireCompany();
  const [docs, reviews] = await Promise.all([
    db.document.count({ where: { companyId: company.id, kind: "existing" } }),
    db.review.findMany({
      where: { companyId: company.id },
      include: { document: true, comments: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const profileFields = [company.description, company.goals, company.activities, company.revenue, company.structure];
  const profileDone = profileFields.filter((f) => f.trim()).length;

  const steps = [
    { n: 1, title: "Complete your company profile", detail: `${profileDone} of ${profileFields.length} sections filled`, href: "/company", done: profileDone === profileFields.length },
    { n: 2, title: "Upload existing contracts", detail: `${docs} in repository`, href: "/documents", done: docs > 0 },
    { n: 3, title: "Review a new contract", detail: `${reviews.length} review${reviews.length === 1 ? "" : "s"} so far`, href: "/reviews", done: reviews.length > 0 },
  ];

  return (
    <>
      <PageHeader title={`Good day, ${company.name}`} subtitle="Your contract workspace at a glance." />
      <div className="space-y-10 px-10 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <Link key={s.n} href={s.href} className="card group p-6 transition hover:border-neutral-900">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-neutral-400">0{s.n}</span>
                <span className={`h-2 w-2 rounded-full ${s.done ? "bg-neutral-900" : "bg-neutral-300"}`} />
              </div>
              <div className="mt-4 font-medium">{s.title}</div>
              <div className="mt-1 text-sm text-neutral-500">{s.detail}</div>
            </Link>
          ))}
        </div>
        <section>
          <h2 className="label">Recent reviews</h2>
          <div className="card divide-y divide-neutral-200">
            {reviews.length === 0 && <p className="p-6 text-sm text-neutral-500">No reviews yet.</p>}
            {reviews.map((r) => (
              <Link key={r.id} href={`/reviews/${r.id}`} className="flex items-center justify-between p-4 hover:bg-neutral-50">
                <span className="text-sm font-medium">{r.document.name}</span>
                <span className="text-xs text-neutral-500">
                  {r.comments.filter((c) => c.status !== "pending").length}/{r.comments.length} resolved · {r.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
