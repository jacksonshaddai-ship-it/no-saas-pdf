"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiGithub, FiMail } from "react-icons/fi";

const NUBANK_PURPLE = "#8A05BE";

function SocialButton({ provider, icon: Icon, children }: { provider: "google" | "github"; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => signIn(provider, { callbackUrl: "/account" })}
      className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-lg font-black text-slate-800 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg hover:shadow-purple-100 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-purple-100"
      style={{ borderColor: NUBANK_PURPLE }}
    >
      <Icon className="w-6 h-6 text-purple-700" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-slate-800">
      <header className="mb-10 text-center">
        <p className="text-sm font-black uppercase tracking-widest" style={{ color: NUBANK_PURPLE }}>Acesso</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Entrar no PDF Master Pro</h1>
        <p className="mt-3 text-sm text-slate-600">Escolha uma opção rápida e segura.</p>
      </header>

      <div className="space-y-4">
        <SocialButton provider="google" icon={FiMail}>
          Continuar com Google
        </SocialButton>

        <SocialButton provider="github" icon={FiGithub}>
          Continuar com GitHub
        </SocialButton>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-600">
          Prefere usar e-mail e senha?{" "}
          <Link className="font-black" href="/login" style={{ color: NUBANK_PURPLE }}>
            Entrar com credenciais
          </Link>
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Não tem conta?{" "}
          <Link className="font-black" href="/register" style={{ color: NUBANK_PURPLE }}>
            Criar conta grátis
          </Link>
        </p>
      </div>

      <p className="mt-10 text-center text-xs text-slate-500">
        Ao continuar, você concorda com nossos
        <Link className="underline hover:text-slate-700" href="/termos">Termos de Uso</Link>
        e
        <Link className="underline hover:text-slate-700 ml-1" href="/privacidade">Política de Privacidade</Link>
        .
      </p>
    </main>
  );
}

function SignInFallback() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12 text-slate-800">
      <header className="mb-10 text-center">
        <p className="text-sm font-black uppercase tracking-widest" style={{ color: NUBANK_PURPLE }}>Acesso</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Entrar no PDF Master Pro</h1>
        <p className="mt-3 text-sm text-slate-600">Escolha uma opção rápida e segura.</p>
      </header>
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-xl border-2 border-slate-200 bg-white" style={{ borderColor: NUBANK_PURPLE }} />
        <div className="h-14 animate-pulse rounded-xl border-2 border-slate-200 bg-white" style={{ borderColor: NUBANK_PURPLE }} />
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}