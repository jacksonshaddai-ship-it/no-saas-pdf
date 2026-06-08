import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Suporte | PDF Master Pro",
  description:
    "Como falar com o suporte, abrir um chamado comercial ou reportar um problema tecnico.",
};

const LAST_UPDATED = "07 de junho de 2026";

export default function SuportePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Suporte</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {LAST_UPDATED}</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-base leading-7">
          <p>
            Existem tres formas de falar com a gente. Escolha a que combina
            com o seu caso.
          </p>

          <h2 className="text-xl font-black text-slate-900">1. Duvida tecnica ou problema com a conta</h2>
          <p>
            Escreva para
            {" "}<a className="underline" href="mailto:suporte@pdfmasterpro.com">suporte@pdfmasterpro.com</a>.
            Inclua:
          </p>
          <ul className="list-disc pl-6">
            <li>o e-mail da sua conta (se tiver);</li>
            <li>a ferramenta que voce estava usando;</li>
            <li>o que aconteceu (com print se possivel);</li>
            <li>o navegador e o sistema operacional.</li>
          </ul>
          <p>
            Respondemos em ate 2 dias uteis para contas pagas e em ate 5
            dias uteis para contas gratis. Em horario comercial (seg-sex,
            9h-18h, horario de Brasilia) costumamos responder no mesmo
            dia.
          </p>

          <h2 className="text-xl font-black text-slate-900">2. Duvida comercial ou Enterprise</h2>
          <p>
            Para compras em volume, contratos Enterprise, integracoes
            personalizadas ou duvidas sobre cobrancas, escreva para
            {" "}<a className="underline" href="mailto:comercial@pdfmasterpro.com">comercial@pdfmasterpro.com</a>.
            Voce tambem pode usar a pagina
            {" "}<Link className="underline" href="/contact-sales">Contato Enterprise</Link>.
          </p>

          <h2 className="text-xl font-black text-slate-900">3. Privacidade, seguranca e LGPD</h2>
          <p>
            Para solicitacoes de exclusao de conta, exportacao de dados ou
            relato de vulnerabilidade, escreva para:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <a className="underline" href="mailto:privacidade@pdfmasterpro.com">privacidade@pdfmasterpro.com</a>
              {" "}(dados pessoais);
            </li>
            <li>
              <a className="underline" href="mailto:seguranca@pdfmasterpro.com">seguranca@pdfmasterpro.com</a>
              {" "}(vulnerabilidades).
            </li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">FAQ rapido</h2>

          <h3 className="text-lg font-black text-slate-900">Mudei de e-mail. Como atualizo na conta?</h3>
          <p>
            Por enquanto, isso exige contato com o suporte. Estamos
            trabalhando em um fluxo de self-service.
          </p>

          <h3 className="text-lg font-black text-slate-900">Posso pedir reembolso?</h3>
          <p>
            Sim, em ate 7 dias apos a primeira compra do plano. Apos isso,
            a politica eh: o plano fica ativo ate o fim do ciclo pago.
          </p>

          <h3 className="text-lg font-black text-slate-900">Nao recebi o e-mail de confirmacao. E agora?</h3>
          <p>
            Confira a caixa de spam. Se nao estiver la, escreva para
            {" "}<a className="underline" href="mailto:suporte@pdfmasterpro.com">suporte@pdfmasterpro.com</a>
            {" "}com o e-mail que voce tentou cadastrar.
          </p>

          <h3 className="text-lg font-black text-slate-900">Como cancelar a assinatura?</h3>
          <p>
            Va em <Link className="underline" href="/account">Conta</Link> &gt;
            {" "}<strong>Plano</strong>. A assinatura permanece ativa ate o
            final do ciclo pago.
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Tambem veja: <Link className="underline" href="/privacidade">Privacidade</Link> ·{" "}
          <Link className="underline" href="/termos">Termos</Link> ·{" "}
          <Link className="underline" href="/seguranca">Seguranca</Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}
