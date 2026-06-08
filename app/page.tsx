import { FeatureSection } from "@/components/FeatureSection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ToolGrid } from "@/components/ToolGrid";
import { getVisibleTools, getImplementedTools, getBasicTools } from "@/lib/tools";

export default function Home() {
  const total = getVisibleTools().length;
  const implemented = getImplementedTools().length;
  const basic = getBasicTools().length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Header />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <p className="mx-auto inline-flex rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700">
            PDF Master Pro
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight text-slate-950">
            Todas as ferramentas de PDF em um só lugar
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Junte, divida, comprima, converta, edite e proteja PDFs direto no navegador.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="rounded-md bg-red-600 px-6 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700"
              href="#ferramentas"
            >
              Explorar ferramentas
            </a>
            <a
              className="rounded-md border border-slate-300 bg-white px-6 py-4 text-base font-black text-slate-800 transition hover:border-red-200 hover:text-red-700"
              href="#privacidade"
            >
              Ver privacidade
            </a>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-black text-slate-950">{total}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">ferramentas catalogadas</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-black text-emerald-700">{basic}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">disponíveis no plano grátis</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-black text-red-700">{implemented}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">implementadas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ToolGrid />
      </section>

      <FeatureSection />
      <Footer />
    </main>
  );
}
