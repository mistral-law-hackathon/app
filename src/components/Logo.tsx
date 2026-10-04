import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded bg-neutral-900 font-serif text-sm font-semibold text-white">§</span>
      <span className="font-serif text-lg font-semibold tracking-tight">Clause</span>
    </Link>
  );
}
