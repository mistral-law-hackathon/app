import { db } from "@/lib/db";
import { requireCompany } from "@/lib/auth";
import { deleteDocument } from "@/lib/actions";
import { PageHeader } from "@/components/PageHeader";
import { UploadForm } from "@/components/UploadForm";

export default async function DocumentsPage() {
  const company = await requireCompany();
  const docs = await db.document.findMany({
    where: { companyId: company.id, kind: "existing" },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Contract repository" subtitle="Agreements already in force. New contracts are checked against all of them." />
      <div className="space-y-8 px-10 py-8">
        <UploadForm mode="repository" />
        <div className="space-y-3">
          {docs.length === 0 && <p className="text-sm text-neutral-500">No contracts yet.</p>}
          {docs.map((d) => (
            <details key={d.id} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-neutral-500">
                    {d.createdAt.toLocaleDateString("en-GB")} · {d.text.length.toLocaleString()} characters
                  </div>
                </div>
                <span className="text-xs text-neutral-400 group-open:hidden">Show summary</span>
              </summary>
              <div className="mt-4 whitespace-pre-wrap border-t border-neutral-200 pt-4 text-sm text-neutral-700">
                {d.summary || "No summary available."}
              </div>
              <form action={deleteDocument} className="mt-4">
                <input type="hidden" name="id" value={d.id} />
                <button className="text-xs text-neutral-500 hover:text-red-700">Remove</button>
              </form>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
