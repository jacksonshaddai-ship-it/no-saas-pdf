import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Politica de Privacidade | PDF Master Pro",
  description:
    "Como o PDF Master Pro coleta, usa e protege os dados dos usuarios. Resumo simples e honesto em portugues.",
};

const LAST_UPDATED = "07 de junho de 2026";

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Politica de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {LAST_UPDATED}</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-base leading-7">
          <p>
            Esta politica descreve, em linguagem simples, quais dados o PDF Master Pro
            coleta, como usa e com quem compartilha. Nao vendemos dados de usuarios. Nao
            usamos arquivos enviados para treinar modelos de inteligencia artificial.
          </p>

          <h2 className="text-xl font-black text-slate-900">1. Dados de conta</h2>
          <p>
            Se voce cria uma conta gratis, pedimos: <strong>nome</strong>, <strong>e-mail</strong> e
            uma <strong>senha</strong>. A senha nunca eh armazenada em texto puro: usamos
            bcrypt com salt para gerar um hash. O unico dado de plano que guardamos eh
            um codigo (FREE, PLUS, PREMIUM, ENTERPRISE ou FREE legado). Tambem registramos a
            data de criacao da conta.
          </p>

          <h2 className="text-xl font-black text-slate-900">2. Pagamentos</h2>
          <p>
            Pagamentos sao processados por provedores externos:{" "}
            <strong>Mercado Pago</strong> (para clientes do Brasil, em reais, via Pix e
            cartao) e <strong>Stripe</strong> (para o resto do mundo, em dolar, via cartao
            e Apple/Google Pay). O PDF Master Pro <strong>nao armazena numero de
            cartao</strong>, nao armazena dados completos do Pix e nao armazena CVV.
            Esses dados ficam apenas no provedor. Nos guardamos apenas o id do
            pagamento, o status, o valor (em centavos) e a moeda, para podermos
            ativar ou cancelar sua assinatura.
          </p>

          <h2 className="text-xl font-black text-slate-900">3. Arquivos enviados</h2>
          <p>
            Ha dois caminhos:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Ferramentas locais</strong> (juntar, dividir, girar, marca
              d'agua, comprimir, numerar, organizar, JPG/PNG para PDF, assinar):
              o arquivo <strong>fica apenas no seu navegador</strong> e nao eh
              enviado para os nossos servidores.
            </li>
            <li>
              <strong>Ferramentas em nuvem</strong> (proteger, desbloquear, PDF
              para Word/Excel/PPT, Word/Excel/PPT/HTML para PDF, OCR, PDF para
              JPG): o arquivo eh enviado <strong>direto do seu navegador para
              o provedor de processamento (CloudConvert)</strong> usando um
              link temporario de upload. O PDF Master Pro <strong>nao
              armazena o arquivo</strong>. Apos o download, solicitamos a
              limpeza do job no provedor.
            </li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">4. Retencao</h2>
          <p>
            Nossa politica de retencao eh: <strong>processou, baixou, descartou</strong>.
            Nao mantemos copia dos seus arquivos. Se a limpeza no provedor
            falhar, registramos o erro de forma segura, mas <strong>nao
            bloqueamos o seu uso</strong>: voce ja fez o download, o PDF Master
            Pro nao tem mais acesso ao arquivo.
          </p>

          <h2 className="text-xl font-black text-slate-900">5. Cookies e identificadores</h2>
          <p>
            Usamos cookies tecnicos e identificadores para:
          </p>
          <ul className="list-disc pl-6">
            <li>manter voce logado;</li>
            <li>aplicar o limite diario de tarefas gratis a visitantes anonimos;</li>
            <li>
              controlar abuso por meio de um hash leve do seu <em>cookie de
              visitante</em>, do <em>hash do IP</em> e de um <em>fingerprint leve</em>
              (IP + User-Agent + idioma + pais). Esses hashes sao irreversiveis
              e nao permitem identificar o visitante fora do nosso sistema.
            </li>
          </ul>
          <p>
            Veja detalhes em <Link className="underline" href="/cookies">Cookies</Link>.
          </p>

          <h2 className="text-xl font-black text-slate-900">6. Inteligencia artificial</h2>
          <p>
            Nao usamos os arquivos enviados para treinar modelos de IA. Quando
            uma ferramenta de IA for adicionada (ex.: "Resumir com IA"), isso
            sera comunicado de forma explicita no fluxo da ferramenta, e os
            termos poderao ser revisados.
          </p>

          <h2 className="text-xl font-black text-slate-900">7. Compartilhamento</h2>
          <p>
            Nao vendemos dados. Nao compartilhamos dados com terceiros exceto:
            (a) Mercado Pago ou Stripe, para processar pagamentos; (b) CloudConvert,
            para processar arquivos em ferramentas de nuvem; (c) Upstash Redis,
            para contar uso anonimo e por usuario (a contagem, nao o conteudo
            dos arquivos); (d) Vercel, que hospeda a aplicacao.
          </p>

          <h2 className="text-xl font-black text-slate-900">8. Direitos do usuario</h2>
          <p>
            Voce pode pedir: (a) exclusao da conta; (b) exportacao dos dados
            pessoais que temos (basicamente: nome, e-mail, plano, historico
            de uso por ferramenta). Para isso, escreva para
            {" "}<a className="underline" href="mailto:privacidade@pdfmasterpro.com">privacidade@pdfmasterpro.com</a>.
          </p>

          <h2 className="text-xl font-black text-slate-900">9. Seguranca</h2>
          <p>
            Veja <Link className="underline" href="/seguranca">Seguranca</Link> para
            detalhes sobre HTTPS, senhas, rate limiting, isolamento entre
            usuarios e controle de abuso.
          </p>

          <h2 className="text-xl font-black text-slate-900">10. Alteracoes nesta politica</h2>
          <p>
            Quando fizermos mudancas relevantes, a data de "ultima atualizacao"
            no topo desta pagina sera alterada. Para mudancas substanciais
            (ex.: novos tipos de dado coletados), avisaremos por e-mail aos
            usuarios com conta.
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Tambem veja: <Link className="underline" href="/termos">Termos de Uso</Link> ·{" "}
          <Link className="underline" href="/seguranca">Seguranca</Link> ·{" "}
          <Link className="underline" href="/cookies">Cookies</Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}
