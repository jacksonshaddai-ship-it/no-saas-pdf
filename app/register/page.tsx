"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setError(json?.message || "Não foi possível criar a conta.");
      setSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl: "/account",
    });
    setSubmitting(false);

    if (!signInResult || signInResult.error) {
      setError("Conta criada, mas o login automático falhou. Tente entrar manualmente.");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-slate-800">
      <header className="mb-8 text-center">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Conta grátis</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Criar conta</h1>
        <p className="mt-2 text-sm text-slate-600">
          5 tarefas por dia, 30 por mês e arquivos de até 20&nbsp;MB nas ferramentas de nuvem.
        </p>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={onSubmit}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-700">Nome</span>
          <input
            autoComplete="name"
            className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            minLength={2}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            required
            type="text"
            value={name}
          />
        </label>
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
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            type="password"
            value={password}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-700">Confirmar senha</span>
          <input
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            minLength={8}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            required
            type="password"
            value={confirm}
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
          {submitting ? "Criando conta..." : "Criar conta grátis"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Já tem conta?{" "}
        <Link className="font-black text-red-600 hover:text-red-700" href="/login">
          Entrar
        </Link>
      </p>
    </main>
  );
}
