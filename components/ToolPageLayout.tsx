import type { ReactNode } from "react";
import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { StatusBadge } from "./StatusBadge";
import { ToolIcon } from "./ToolIcon";
import { PlanBadge } from "./PlanBadge";

export function ToolPageLayout({ tool, children }: { tool: Tool; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link className="inline-flex text-sm font-bold text-slate-600 hover:text-red-700" href="/#ferramentas">
            ← Voltar para ferramentas
          </Link>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-100">
              <ToolIcon className="h-7 w-7" icon={tool.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black text-slate-950">{tool.name}</h1>
                <StatusBadge status={tool.status} />
                <PlanBadge tool={tool} />
              </div>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{tool.description}</p>
              {tool.localProcessing && tool.implemented && (
                <p className="mt-3 text-sm font-bold text-emerald-700">Processamento local no navegador para esta ferramenta.</p>
              )}
              {!tool.implemented && (
                <p className="mt-3 text-sm font-bold text-amber-700">
                  Esta ferramenta está em desenvolvimento. Em breve estará disponível no plano indicado.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</section>

      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-slate-500">
          Processou, baixou, descartou. Nao armazenamos seus arquivos permanentemente.{" "}
          <Link className="underline" href="/privacidade">Saiba mais</Link>.
        </p>
      </section>
      <Footer />
    </main>
  );
}
