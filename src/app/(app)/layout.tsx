import { requireCompany } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const company = await requireCompany();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/60 px-4 py-5">
        <Logo href="/dashboard" />
        <nav className="mt-8 space-y-1">
          <NavLink href="/dashboard">Overview</NavLink>
          <NavLink href="/company">Company profile</NavLink>
          <NavLink href="/documents">Contract repository</NavLink>
          <NavLink href="/reviews">Reviews</NavLink>
        </nav>
        <div className="mt-auto border-t border-neutral-200 pt-4">
          <div className="truncate text-sm font-medium">{company.name}</div>
          <div className="truncate text-xs text-neutral-500">{company.email}</div>
          <form action={logout}>
            <button className="mt-3 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
