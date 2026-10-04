"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText, className = "btn-primary" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {pending ? pendingText ?? children : children}
    </button>
  );
}
