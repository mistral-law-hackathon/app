"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";
import { FormMessage } from "./FormMessage";
import { Logo } from "./Logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create your company account"}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === "login" ? "Welcome back." : "Review every new contract against what you already signed."}
          </p>
          <form action={action} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="name">Company name</label>
                <input className="input" id="name" name="name" required placeholder="Acme GmbH" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Work email</label>
              <input className="input" id="email" name="email" type="email" required placeholder="legal@acme.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input className="input" id="password" name="password" type="password" required minLength={8} />
            </div>
            <FormMessage state={state} />
            <SubmitButton className="btn-primary w-full">{mode === "login" ? "Sign in" : "Create account"}</SubmitButton>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">
          {mode === "login" ? (
            <>No account? <Link href="/signup" className="font-medium text-neutral-900 underline underline-offset-4">Sign up</Link></>
          ) : (
            <>Already registered? <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-4">Sign in</Link></>
          )}
        </p>
      </div>
    </main>
  );
}
