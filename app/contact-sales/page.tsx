// app/contact-sales/page.tsx
// Pagina simples para contato Enterprise. Sem checkout automatico.

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Contato comercial | PDF Master Pro",
  description: "Fale com nosso time comercial para o plano Empresarial.",
};

export default function ContactSalesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-black sm:text-4xl">Plano Empresarial</h1>
        <p className="mt-3 text-base text-slate-600">
          O plano <strong>Empresarial</strong> é sob consulta. Ele foi feito para times com
          alto volume, requisitos de SLA, gestão de equipe e integrações dedicadas.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black">O que está incluso</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>✓ Todas as ferramentas disponíveis</li>
              <li>✓ Limites personalizados e SLA</li>
              <li>✓ Gestão de equipe</li>
              <li>✓ API dedicada e integrações</li>
              <li>✓ Suporte dedicado</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black">Como contratar</h2>
            <p className="mt-3 text-sm text-slate-700">
              Envie um e-mail para{" "}
              <a className="font-bold text-red-700 underline" href="mailto:vendas@pdfmasterpro.com">
                vendas@pdfmasterpro.com
              </a>{" "}
              com:
            </p>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
              <li>Nome da empresa</li>
              <li>Volume estimado de uso</li>
              <li>Ferramentas de maior interesse</li>
              <li>Janela para início</li>
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <a
            className="inline-flex items-center justify-center rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            href="mailto:vendas@pdfmasterpro.com?subject=Plano%20Empresarial%20%E2%80%93%20Contato"
          >
            Falar com vendas
          </a>
          <a
            className="ml-3 inline-flex items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            href="/pricing"
          >
            Voltar aos planos
          </a>
        </div>
      </section>
      <Footer />
    </main>
  );
}
