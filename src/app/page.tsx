import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyId } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default async function Home() {
  if (await getCompanyId()) redirect("/dashboard");
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Contract intelligence</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-tight tracking-tight">
          Know what a new contract means for everything you have already signed.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-neutral-600">
          Clause compares incoming agreements with your company profile and existing contracts, flags direct conflicts and
          long-term risks clause by clause, and lets you accept, reject or discuss every finding before you respond.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3">Create company account</Link>
        </div>
        <div className="mt-24 grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 md:grid-cols-3">
          {[
            ["01", "Profile", "Goals, activities, revenues and structure become the lens every contract is read through."],
            ["02", "Repository", "Upload existing agreements. Clause reads PDFs, scans and Word files."],
            ["03", "Review", "Each risk is anchored to the exact clause. Accept, reject or ask the AI, then send."],
          ].map(([n, t, d]) => (
            <div key={n} className="bg-white p-8">
              <div className="font-mono text-xs text-neutral-400">{n}</div>
              <div className="mt-3 font-serif text-xl font-semibold">{t}</div>
              <p className="mt-2 text-sm text-neutral-600">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
