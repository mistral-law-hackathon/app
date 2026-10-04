"use client";

import { useActionState } from "react";
import { updateCompany } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";
import { FormMessage } from "./FormMessage";

type Values = Record<string, string>;

const SECTIONS: { title: string; fields: { name: string; label: string; placeholder: string; long?: boolean }[] }[] = [
  {
    title: "Identity",
    fields: [
      { name: "name", label: "Company name", placeholder: "Acme GmbH" },
      { name: "industry", label: "Industry", placeholder: "B2B SaaS, logistics software" },
      { name: "jurisdiction", label: "Jurisdiction", placeholder: "Germany (Berlin), EU" },
      { name: "description", label: "Description", placeholder: "What the company does, for whom.", long: true },
    ],
  },
  {
    title: "Strategy",
    fields: [
      { name: "goals", label: "Goals", placeholder: "Expand to France in 2027, keep IP ownership, raise Series B…", long: true },
      { name: "activities", label: "Activities", placeholder: "Products, services, key markets, distribution channels.", long: true },
    ],
  },
  {
    title: "Finance & structure",
    fields: [
      { name: "revenue", label: "Revenues", placeholder: "€12M ARR, 40% from top 3 customers, growing 60% YoY", long: true },
      { name: "structure", label: "Company structure", placeholder: "Holding, subsidiaries, shareholders, board, signing authority.", long: true },
      { name: "risks", label: "Sensitivities & red lines", placeholder: "No exclusivity, liability capped at 12 months fees, no non-compete beyond 1 year…", long: true },
    ],
  },
];

export function CompanyForm({ values }: { values: Values }) {
  const [state, action] = useActionState(updateCompany, undefined);
  return (
    <form action={action} className="max-w-3xl space-y-10">
      {SECTIONS.map((s) => (
        <section key={s.title} className="grid gap-6 md:grid-cols-[180px_1fr]">
          <h2 className="font-serif text-lg font-semibold">{s.title}</h2>
          <div className="space-y-5">
            {s.fields.map((f) => (
              <div key={f.name}>
                <label className="label" htmlFor={f.name}>{f.label}</label>
                {f.long ? (
                  <textarea className="input min-h-24" id={f.name} name={f.name} defaultValue={values[f.name]} placeholder={f.placeholder} />
                ) : (
                  <input className="input" id={f.name} name={f.name} defaultValue={values[f.name]} placeholder={f.placeholder} />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex items-center gap-4 border-t border-neutral-200 pt-6">
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
