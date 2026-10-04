import { requireCompany } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { CompanyForm } from "@/components/CompanyForm";

export default async function CompanyPage() {
  const c = await requireCompany();
  const { name, industry, jurisdiction, description, goals, activities, revenue, structure, risks } = c;
  return (
    <>
      <PageHeader title="Company profile" subtitle="Every review is read through this context. The more precise, the better the findings." />
      <div className="px-10 py-8">
        <CompanyForm values={{ name, industry, jurisdiction, description, goals, activities, revenue, structure, risks }} />
      </div>
    </>
  );
}
