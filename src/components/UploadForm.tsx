"use client";

import { useActionState, useState } from "react";
import { uploadDocuments, startReview, type FormState } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";
import { FormMessage } from "./FormMessage";

export function UploadForm({ mode }: { mode: "repository" | "review" }) {
  const [state, action] = useActionState<FormState, FormData>(mode === "review" ? startReview : uploadDocuments, undefined);
  const [names, setNames] = useState<string[]>([]);
  return (
    <form action={action} className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center transition hover:border-neutral-900">
        <span className="text-sm font-medium">{names.length ? names.join(", ") : mode === "review" ? "Drop or choose the contract to review" : "Drop or choose contracts"}</span>
        <span className="mt-1 text-xs text-neutral-500">PDF, DOCX, TXT or scanned image · up to 15 MB</span>
        <input
          type="file"
          name={mode === "review" ? "file" : "files"}
          multiple={mode === "repository"}
          accept=".pdf,.docx,.txt,.md,image/*"
          className="sr-only"
          onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))}
        />
      </label>
      <div className="flex items-center gap-4">
        <SubmitButton pendingText={mode === "review" ? "Analysing with AI… (up to a minute)" : "Reading documents…"}>
          {mode === "review" ? "Start review" : "Add to repository"}
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
