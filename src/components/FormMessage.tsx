import type { FormState } from "@/lib/actions";

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="break-all rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{state.ok}</p>;
  return null;
}
