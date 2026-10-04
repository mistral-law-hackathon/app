export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-neutral-200 px-10 pb-6 pt-10">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
