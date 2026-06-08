"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search?.get("callbackUrl") || "/account";
  const initialError = search?.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "CredentialsSignin" ? "E-mail ou senha incorretos." : null,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
    });
    setSubmitting(false);
    if (!result || result.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push(result.url || callbackUrl);
    router.refresh();
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={onSubmit}
    >
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">E-mail</span>
        <input
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Senha</span>
        <input
          autoComplete="current-password"
          className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          required
          type="password"
          value={password}
        />
      </label>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        className="w-full rounded-md bg-red-600 px-5 py-3 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
      <div className="h-12 animate-pulse rounded-md bg-slate-200" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-slate-800">
      <header className="mb-8 text-center">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Conta</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Entrar</h1>
        <p className="mt-2 text-sm text-slate-600">Use seu e-mail e senha para liberar mais tarefas.</p>
      </header>

      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-slate-600">
        Ainda não tem conta?{" "}
        <Link className="font-black text-red-600 hover:text-red-700" href="/register">
          Criar conta grátis
        </Link>
      </p>
    </main>
  );
}
