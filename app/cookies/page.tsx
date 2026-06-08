import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Cookies | PDF Master Pro",
  description:
    "Que cookies e identificadores o PDF Master Pro usa, e para que serve cada um.",
};

const LAST_UPDATED = "07 de junho de 2026";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Cookies</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {LAST_UPDATED}</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-base leading-7">
          <p>
            Esta pagina descreve os cookies e identificadores usados pelo
            PDF Master Pro. Mantemos a lista minima possivel e usamos
            cookies apenas para finalidades tecnicas ou com seu consentimento
            explicito.
          </p>

          <h2 className="text-xl font-black text-slate-900">Cookies tecnicos (sempre ativos)</h2>

          <h3 className="text-lg font-black text-slate-900">Sessao logada</h3>
          <p>
            Quando voce cria uma conta ou faz login, definimos um cookie
            HttpOnly que armazena um JSON Web Token assinado. Esse cookie
            permite que o servidor reconheca voce entre paginas. Ele
            expira quando voce faz logout ou quando o token expira.
          </p>

          <h3 className="text-lg font-black text-slate-900">Sessao anonima (visitante)</h3>
          <p>
            Se voce nao esta logado, definimos um cookie leve chamado
            {" "}<code>pdf_anon_id</code>. Ele serve apenas para contar
            quantas tarefas voce ja fez no dia. O cookie nao identifica
            voce pessoalmente.
          </p>

          <h3 className="text-lg font-black text-slate-900">CSRF</h3>
          <p>
            Para formularios sensiveis (pagamentos, login, exclusao de conta)
            usamos tokens anti-CSRF baseados em sessao. Eles sao armazenados
            em cookies HttpOnly de curta duracao.
          </p>

          <h2 className="text-xl font-black text-slate-900">Cookies de rate limit</h2>
          <p>
            Em complemento ao Redis, podemos definir cookies de
            {" "}<code>pdf_rate_*</code> que armazenam um hash leve do seu
            IP + User-Agent + idioma + pais. O objetivo eh impedir que
            uma pessoa crie varias contas para burlar o limite diario.
            Os valores sao hashes irreversiveis: nao eh possivel
            descobrir seu IP a partir deles.
          </p>

          <h2 className="text-xl font-black text-slate-900">Cookies de pagamento</h2>
          <p>
            Cookies definidos por Mercado Pago ou Stripe (em suas proprias
            paginas de checkout) sao controlados por esses provedores.
            Eles podem definir cookies para fraud prevention e para
            reconhecer o cliente entre paginas. Esses cookies sao
            necessarios para que o pagamento funcione. Veja a politica
            de cada provedor:
            {" "}<a className="underline" href="https://www.mercadopago.com.br/privacidade" rel="noreferrer" target="_blank">Mercado Pago</a>{" "}
            e
            {" "}<a className="underline" href="https://stripe.com/privacy" rel="noreferrer" target="_blank">Stripe</a>.
          </p>

          <h2 className="text-xl font-black text-slate-900">O que NAO usamos</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Analytics avancado</strong> (Google Analytics, Meta
              Pixel, Hotjar) <strong>sem consentimento</strong>. Se em
              algum momento adicionarmos, voce vera um banner de
              consentimento opt-in.
            </li>
            <li>
              <strong>Ads</strong> nao. O servico eh pago por assinatura,
              nao por propaganda.
            </li>
            <li>
              <strong>Rastreamento de redes sociais</strong> (botoes de
              compartilhamento com fingerprint) nao.
            </li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">Como gerenciar cookies</h2>
          <p>
            Voce pode bloquear ou apagar cookies nas configuracoes do seu
            navegador. Atencao: bloquear todos os cookies tecnicos impede
            o login e a contagem diaria de tarefas.
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Tambem veja: <Link className="underline" href="/privacidade">Privacidade</Link> ·{" "}
          <Link className="underline" href="/seguranca">Seguranca</Link> ·{" "}
          <Link className="underline" href="/termos">Termos</Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}
