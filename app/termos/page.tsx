import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Termos de Uso | PDF Master Pro",
  description:
    "Regras de uso do PDF Master Pro: o que eh permitido, o que nao eh, como funcionam planos e ativacao.",
};

const LAST_UPDATED = "07 de junho de 2026";

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {LAST_UPDATED}</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-base leading-7">
          <p>
            Ao usar o PDF Master Pro voce concorda com estes termos. Se voce
            nao concordar, nao use a plataforma. Estes termos sao simples e
            foram escritos para serem lidos.
          </p>

          <h2 className="text-xl font-black text-slate-900">1. O que eh o PDF Master Pro</h2>
          <p>
            O PDF Master Pro eh uma ferramenta web para manipulacao de PDFs e
            arquivos relacionados (Word, Excel, PowerPoint, JPG, PNG, HTML).
            Oferecemos um plano gratis com limite diario de tarefas e planos
            pagos (PLUS, PREMIUM, ENTERPRISE) com cotas maiores ou ilimitadas.
          </p>

          <h2 className="text-xl font-black text-slate-900">2. Conta</h2>
          <p>
            A conta eh pessoal e intransferivel. Voce eh responsavel por
            manter a senha segura. Nao compartilhe sua conta. Criar varias
            contas gratis para burlar o limite diario eh uso indevido e pode
            levar ao bloqueio.
          </p>

          <h2 className="text-xl font-black text-slate-900">3. Uso permitido</h2>
          <ul className="list-disc pl-6">
            <li>Trabalhar com seus proprios documentos.</li>
            <li>Trabalhar com documentos de terceiros que voce tem direito de modificar.</li>
            <li>Automatizar tarefas via navegador, desde que seja uso humano razoavel.</li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">4. Uso proibido</h2>
          <ul className="list-disc pl-6">
            <li>Enviar documentos que violem leis locais ou internacionais.</li>
            <li>
              Tentar burlar limites: criar varias contas, usar scripts para
              automatizar downloads, fazer engenharia reversa do servico.
            </li>
            <li>
              Tentar acessar dados de outros usuarios, mesmo em caso de bug.
              Se encontrar, escreva para
              {" "}<a className="underline" href="mailto:seguranca@pdfmasterpro.com">seguranca@pdfmasterpro.com</a>
              {" "}e ganhara um agradecimento publico (se quiser).
            </li>
            <li>
              Usar a plataforma para treinar ou alimentar modelos de
              inteligencia artificial.
            </li>
            <li>
              Revender o servico sem contrato Enterprise formal.
            </li>
          </ul>

          <h2 className="text-xl font-black text-slate-900">5. Planos e ativacao</h2>
          <p>
            Planos pagos sao cobrados mensalmente, em reais (Mercado Pago,
            publico BR) ou em dolar (Stripe, publico internacional). A
            ativacao do plano <strong>somente ocorre apos a confirmacao do
            provedor de pagamento</strong> via webhook. Nao acredite em
            promessas de ativacao imediata: isso protege voce e nos protege
            de chargebacks fraudulentos.
          </p>
          <p>
            Cancelamento eh livre a qualquer momento. Se cancelar no meio do
            ciclo, voce continua com o plano ate o final do periodo pago. Veja
            a pagina <Link className="underline" href="/pricing">Precos</Link>{" "}
            para valores atualizados.
          </p>

          <h2 className="text-xl font-black text-slate-900">6. Plano Enterprise</h2>
          <p>
            Para volumes acima do PREMIUM (acima de 50 GB/mes de processamento,
            equipe com mais de 50 usuarios, ou necessidades de SLA), fale com
            nosso comercial em
            {" "}<a className="underline" href="mailto:comercial@pdfmasterpro.com">comercial@pdfmasterpro.com</a>.
            Enterprise eh sob contrato e nao eh ativado por checkout
            automatico.
          </p>

          <h2 className="text-xl font-black text-slate-900">7. Limites tecnicos e rate limiting</h2>
          <p>
            Para garantir disponibilidade a todos, aplicamos limites por
            usuario (e por visitante anonimo). Os limites sao
            proporcionais ao plano e estao detalhados na pagina
            {" "}<Link className="underline" href="/pricing">Precos</Link>. Em
            horarios de pico, podemos reduzir temporariamente a velocidade
            maxima de processamento de contas FREE para priorizar contas
            pagas.
          </p>

          <h2 className="text-xl font-black text-slate-900">8. Bloqueio por abuso</h2>
          <p>
            Em caso de abuso, violacao destes termos ou tentativa de fraude
            de pagamento, podemos suspender a conta imediatamente, sem
            reembolso proporcional. Em caso de duvida razoavel, avisaremos
            por e-mail com prazo para resposta antes de suspender.
          </p>

          <h2 className="text-xl font-black text-slate-900">9. Sem garantia de servico perfeito</h2>
          <p>
            Fazemos o possivel para manter o servico no ar 24/7, mas nao
            garantimos disponibilidade continua. Em caso de manutencao ou
            falha, nao ha compensacao financeira, exceto para contratos
            Enterprise com SLA. Esta eh uma ferramenta utilitaria, nao um
            sistema critico.
          </p>

          <h2 className="text-xl font-black text-slate-900">10. Limitacao de responsabilidade</h2>
          <p>
            O PDF Master Pro nao se responsabiliza por perda de dados,
            perda de receita, perda de oportunidade ou danos indiretos
            decorrentes do uso da plataforma. Sua responsabilidade maxima
            (em qualquer caso) eh limitada ao valor pago nos ultimos 12
            meses.
          </p>

          <h2 className="text-xl font-black text-slate-900">11. Mudancas nestes termos</h2>
          <p>
            Podemos atualizar estes termos para refletir novos recursos ou
            requisitos legais. A data de "ultima atualizacao" no topo indica
            a ultima revisao. Para mudancas substanciais, avisaremos por
            e-mail com 30 dias de antecedencia.
          </p>

          <h2 className="text-xl font-black text-slate-900">12. Foro</h2>
          <p>
            Estes termos sao regidos pela legislacao brasileira. Fica eleito
            o foro de Sao Paulo/SP como competente para dirimir qualquer
            controversia, salvo quando houver contrato Enterprise formal
            indicando outro foro.
          </p>
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Tambem veja: <Link className="underline" href="/privacidade">Privacidade</Link> ·{" "}
          <Link className="underline" href="/seguranca">Seguranca</Link> ·{" "}
          <Link className="underline" href="/suporte">Suporte</Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}
