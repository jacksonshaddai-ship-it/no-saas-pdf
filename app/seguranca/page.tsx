import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Seguranca | PDF Master Pro",
  description:
    "Como o PDF Master Pro protege seus dados, senhas, arquivos e pagamentos.",
};

const LAST_UPDATED = "07 de junho de 2026";

export default function SegurancaPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Seguranca</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {LAST_UPDATED}</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-base leading-7">
          <p>
            Seguranca nao eh uma feature, eh uma pratica diaria. Esta pagina
            descreve o que fazemos para proteger seus dados, senhas, arquivos
            e pagamentos. Tambem diz o que <strong>nao</strong> prometemos
            (para nao criar expectativa falsa).
          </p>

          <h2 className="text-xl font-black text-slate-900">O que garantimos</h2>

          <h3 className="text-lg font-black text-slate-900">HTTPS em producao</h3>
          <p>
            Toda a aplicacao roda sobre HTTPS (TLS 1.2 ou superior). Cookies
            de sessao tem o flag <code>Secure</code> em producao. HSTS eh
            aplicado pelo provedor de hospedagem (Vercel).
          </p>

          <h3 className="text-lg font-black text-slate-900">Senhas com hash forte</h3>
          <p>
            Senhas sao armazenadas usando bcrypt com salt por usuario. Na
            pratica, mesmo se um atacante tivesse acesso ao banco, nao
            conseguiria recuperar as senhas em texto puro.
          </p>

          <h3 className="text-lg font-black text-slate-900">Sessoes via JWT assinado</h3>
          <p>
            Quando voce esta logado, a sessao eh um JSON Web Token assinado
            com <code>NEXTAUTH_SECRET</code>. O token eh HttpOnly, tem tempo
            de vida limitado e eh rotacionado a cada renovacao.
          </p>

          <h3 className="text-lg font-black text-slate-900">Arquivos nao ficam no servidor</h3>
          <p>
            Ferramentas locais (juntar, dividir, girar, marca d'agua,
            comprimir, numerar, organizar, JPG/PNG para PDF, assinar) sao
            processadas <strong>inteiramente no seu navegador</strong>{" "}
            usando <code>pdf-lib</code>. O arquivo nao sai da sua
            maquina.
          </p>
          <p>
            Ferramentas em nuvem (proteger, desbloquear, conversao Word/PPT/
            Excel/HTML, OCR, PDF para JPG) enviam o arquivo
            {" "}<strong>direto do seu navegador para o provedor de
            processamento (CloudConvert)</strong> usando um link
            temporario e unico de upload. O PDF Master Pro nao copia
            nem armazena o arquivo. Apos o download, solicitamos a
            limpeza do job no provedor. Se a limpeza falhar, registramos
            o erro de forma segura, mas voce ja tem o arquivo na sua
            maquina.
          </p>

          <h3 className="text-lg font-black text-slate-900">Pagamentos isolados do nosso codigo</h3>
          <p>
            Os provedores de pagamento (Mercado Pago e Stripe) cuidam dos
            dados sensiveis do cartao. Nos nao armazenamos numero de cartao,
            codigo de seguranca ou dados completos do Pix. Webhooks de
            pagamento sao validados por assinatura HMAC antes de ativarmos
            qualquer plano.
          </p>

          <h3 className="text-lg font-black text-slate-900">Rate limiting</h3>
          <p>
            Aplicamos rate limiting por usuario logado e por visitante
            anonimo nas rotas que disparam processamento. O controle
            usa Upstash Redis (em producao) ou um mapa em memoria (em
            desenvolvimento). O objetivo eh impedir abuso sem atrapalhar
            uso legitimo.
          </p>

          <h3 className="text-lg font-black text-slate-900">Controle de abuso por visitantes anonimos</h3>
          <p>
            Visitantes nao logados que ultrapassem o limite diario sao
            bloqueados de forma leve (um cookie de "ja usou" e um hash do
            IP + User-Agent). Nao eh rastreamento individual. Os hashes
            sao irreversiveis.
          </p>

          <h3 className="text-lg font-black text-slate-900">Cabecalhos de seguranca</h3>
          <p>
            Aplicamos os seguintes cabecalhos em todas as respostas:
          </p>
          <ul className="list-disc pl-6">
            <li><code>X-Frame-Options: DENY</code></li>
            <li><code>X-Content-Type-Options: nosniff</code></li>
            <li><code>Referrer-Policy: strict-origin-when-cross-origin</code></li>
            <li><code>Permissions-Policy: camera=(), microphone=(), geolocation=()</code></li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">O que NAO garantimos</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>ISO 27001 ou SOC 2.</strong> Somos um servico
              utilitario de tamanho medio. Nao temos certificacao formal
              de seguranca. Para clientes com essa exigencia, oferecemos
              contrato Enterprise com clausulas especificas de SLA.
            </li>
            <li>
              <strong>SSO / SAML / OIDC corporativo.</strong> Nao
              oferecemos login corporativo integrado a Active Directory,
              Okta, Azure AD, Google Workspace etc. Para isso, contate o
              comercial para avaliar viabilidade.
            </li>
            <li>
              <strong>Processamento regional certificado.</strong> Nao
              garantimos que o arquivo permaneceu em uma regiao geografica
              especifica (LGPD, GDPR). O provedor de processamento pode
              usar data centers em outros paises. Para exigencias
              contratuais de residencia, contate o comercial.
            </li>
            <li>
              <strong>Retencao de 2 horas dos arquivos.</strong> Nao
              oferecemos uma area de arquivos salvos. A politica eh:
              processou, baixou, descartou.
            </li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">Voce tambem ajuda</h2>
          <ul className="list-disc pl-6">
            <li>Use uma senha forte e unica para sua conta.</li>
            <li>Nao compartilhe sua conta com outras pessoas.</li>
            <li>
              Fez logout de um computador publico? Limpe os cookies do
              navegador.
            </li>
            <li>
              Recebeu um e-mail suspeito pedindo seus dados? Ignore.
              Suporte nunca pede sua senha.
            </li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">Encontrou uma vulnerabilidade?</h2>
          <p>
            Escreva para
            {" "}<a className="underline" href="mailto:seguranca@pdfmasterpro.com">seguranca@pdfmasterpro.com</a>.
            Aceitamos relatos de boa fe, sem necessidade de acordo formal
            para isso. Nao atacamos pesquisadores que reportam.
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Tambem veja: <Link className="underline" href="/privacidade">Privacidade</Link> ·{" "}
          <Link className="underline" href="/termos">Termos</Link> ·{" "}
          <Link className="underline" href="/cookies">Cookies</Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}
