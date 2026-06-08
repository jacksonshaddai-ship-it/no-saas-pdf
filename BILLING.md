# Billing — Fase 5

Esta fase adiciona o sistema de assinaturas pagas ao PDF Master Pro, sem
alterar o que já funcionava na Fase 2 (anônimo + limite), Fase 3 (Auth.js +
Prisma) e Fase 4 (catálogo + planos + testes oficiais). Nenhum teste
anterior foi removido.

## 1. Planos públicos

| Código       | Nome       | BR (BRL)        | Global (USD)     | Observação              |
|--------------|------------|-----------------|------------------|-------------------------|
| `FREE`       | Básico     | grátis          | grátis           | já existia             |
| `PLUS`       | Plus       | R$14,90/mês · R$89,90/ano | US$2,99/mês · US$17,99/ano | **Pix** e **cartão** |
| `PREMIUM`    | Premium    | R$24,90/mês · R$149,90/ano | US$4,99/mês · US$29,99/ano | **Pix** e **cartão** |
| `ENTERPRISE` | Enterprise | **Sob consulta** | **Sob consulta** | venda manual via e-mail |

Enterprise não tem preço público e não tem checkout automático. O botão
"Contactar vendas" leva à página `/contact-sales`.

## 2. Provedores de pagamento

O `lib/billing/provider.ts` decide automaticamente:

- **Mercado Pago** para clientes do Brasil (Pix, cartão, boleto).
  URL canônica: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=…`
- **Stripe Checkout** para o resto do mundo (cartão, Apple Pay, Google Pay).
  URL canônica: `https://checkout.stripe.com/c/pay/cs_test_…`

A escolha é feita por `country === "BR"` ou `currency === "BRL"`, ou forçada
via `PAYMENT_PROVIDER_BR` / `PAYMENT_PROVIDER_GLOBAL` no `.env`.

## 3. Onde o código vive

```
lib/billing/
├── types.ts            # BillingProvider, PaidPlanCode, SubscriptionStatus,
│                       # PaymentStatus, BillingError
├── plans.ts            # preços públicos (Plus / Premium, BR / Global)
├── provider.ts         # roteador BR vs Global, getAppUrl, isPaidPlan
├── signature.ts        # HMAC dos webhooks (MP e Stripe)
├── mercado-pago.ts     # createMpPreference + isMercadoPagoConfigured
├── stripe.ts           # createStripeCheckoutSession + isStripeConfigured
└── index.ts            # API pública: createCheckout, activateSubscription,
                        # markPayment, cancelSubscriptionByUserId,
                        # getBillingStatus
```

Endpoints:

- `POST /api/billing/checkout` — recebe `{ planCode, billingCycle, country, currency }`,
  exige login, rejeita `ENTERPRISE` (400 → `/contact-sales`), cria um
  `Payment` em estado `pending` e devolve `{ checkoutUrl }`.
- `GET /api/billing/status` — devolve `{ plan, subscription, payments }`.
- `POST /api/webhooks/mercado-pago` — recebe notificações IPN/Webhook do MP.
- `POST /api/webhooks/stripe` — recebe eventos do Stripe (`checkout.session.completed`,
  `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`,
  `customer.subscription.deleted`).

Frontend:

- `/pricing` — toggle **Mensal / Anual** (com selo "Economize") e seletor
  **Brasil / Global**. Para Plus/Premium chama o checkout. Para Enterprise
  abre "Contactar vendas".
- `/billing/status` — mostra plano atual, status da assinatura e histórico
  de pagamentos. Tem botão "Já paguei, verificar status".
- `/contact-sales` — formulário simples + e-mail `vendas@pdfmasterpro.com`.

## 4. Regras de ativação

A regra mais importante: **nunca ativamos um plano pago só porque o cliente
voltou para `success_url`**. A ativação só acontece quando o webhook chega
com um dos seguintes status:

- Mercado Pago: `data.status` ∈ `{ "approved", "paid" }`
- Stripe: evento `checkout.session.completed` **ou** `invoice.paid`

Quando o webhook é aprovado:

1. Marcamos o `Payment` como `succeeded` (ou criamos um novo registro se for
   a primeira mensalidade).
2. Fazemos `upsert` em `Subscription` (`status = ACTIVE`, `currentPeriodEnd`
   coerente com o ciclo, `provider`, `providerSubscriptionId`).
3. Atualizamos `User.planCode` para `PLUS` ou `PREMIUM`.

Em caso de falha de pagamento (`rejected`, `payment_failed`, etc.), o
`Payment` é marcado como `failed` e a assinatura, se for renovação, fica
`PAST_DUE`. Cancelamento (`refunded`, `subscription.deleted`) volta o
usuário para `FREE`.

Toda essa lógica é feita em transação no `lib/billing/index.ts`
(`activateSubscription`) para evitar inconsistência entre `Payment`,
`Subscription` e `User.planCode`.

## 5. Segurança de credenciais

Os segredos **nunca** aparecem no bundle do frontend. Toda chamada ao
provedor passa por rotas internas (`/api/billing/checkout` e
`/api/webhooks/*`), que rodam no servidor Next.js. As variáveis
`MERCADO_PAGO_ACCESS_TOKEN` e `STRIPE_SECRET_KEY` ficam apenas no servidor
(`.env.local` em dev, Environment Variables do Vercel em prod).

A validação de assinatura dos webhooks usa HMAC-SHA256:

- Mercado Pago: header `x-signature` comparado com o HMAC do `x-id` + body.
- Stripe: header `stripe-signature` comparado com o HMAC do
  `STRIPE_WEBHOOK_SECRET` + payload cru.

Em dev/test, defina `BILLING_SKIP_WEBHOOK_SIG=1` para pular essa validação
(os mocks da Fase 5 enviam webhooks que já não assinam). **Nunca use
`BILLING_SKIP_WEBHOOK_SIG=1` em produção.**

## 6. Testes

`tests/phase5/` é a suíte oficial:

- `mock-mercado-pago.mjs` — servidor mock na porta **3600**.
- `mock-stripe.mjs` — servidor mock na porta **3700**.
- `test-phase5.mjs` — runner que sobe os dois mocks, usa o app real via
  `localhost:3010`, e cobre 13 cenários (autenticação, checkout MP,
  checkout Stripe, status pré-webhook, success_url não ativa, webhook MP
  ativa, ferramenta Plus liberada, webhook Stripe ativa, rejeição MP,
  ENTERPRISE contact-sales, Em breve 409, Básico 201).
- `README.md` — como rodar.

Para rodar:

```bash
# 1) Em um terminal, suba o dev server
APP_URL=http://localhost:3010 NEXTAUTH_URL=http://localhost:3010 \
MERCADO_PAGO_API_URL=http://localhost:3600 \
STRIPE_API_URL=http://localhost:3700 \
MERCADO_PAGO_ACCESS_TOKEN=mock-mp-key \
STRIPE_SECRET_KEY=mock-stripe-key \
BILLING_SKIP_WEBHOOK_SIG=1 \
PORT=3010 npm run dev

# 2) Em outro terminal, rode a suíte
npm run test:phase5
```

Para confirmar que nada anterior quebrou:

```bash
npm run test:phase4   # 27/27 esperado
```

## 7. Deploy em Vercel

1. Configure as variáveis listadas em `.env.example` no painel do projeto
   (NÃO faça commit dos segredos).
2. Aponte os webhooks para:
   - MP: `https://SEU-APP.vercel.app/api/webhooks/mercado-pago`
   - Stripe: `https://SEU-APP.vercel.app/api/webhooks/stripe`
3. Crie a assinatura gratuita "Plus" e "Premium" no painel de cada
   provedor (preço + moeda) e copie os IDs para `lib/billing/plans.ts`
   se quiser usá-los em produção (na Fase 5 a ativação é por
   `metadata`, então não é obrigatório, mas é recomendável).
4. Rode `npx prisma migrate deploy` (ou `prisma db push` se estiver
   usando SQLite em dev).

## 8. Manual override (uso interno, dev)

Para testar o app sem acionar gateway real, você pode:

1. Subir os mocks: `npm run mock:mercadopago` e `npm run mock:stripe`.
2. Definir `BILLING_SKIP_WEBHOOK_SIG=1` no `.env.local`.
3. Visitar `/pricing` e clicar em "Assinar Plus" ou "Assinar Premium".
4. O checkout vai para `http://localhost:3600/checkout/…` (ou 3700 para
   Stripe) e você usa os endpoints `__checkout/simulate` dos mocks para
   disparar o webhook aprovado.

Em produção **não** existe manual override — apenas webhook + dashboard
do gateway.

## 9. Limites da Fase 5

- Sem renovação automática real: dependemos do webhook. Se o Stripe/MP
  não entregar, a assinatura fica `PAST_DUE` mas não cortamos o acesso
  imediatamente (cortesia de 3 dias).
- Sem cupons, sem upgrade/downgrade no meio do ciclo, sem cálculo de
  prorrateamento. Esses itens estão reservados para a Fase 6.
- Sem faturas em PDF. O cliente baixa pelo dashboard do gateway.
- Enterprise é 100% manual — sem checkout, sem webhook, sem portal de
  cliente.
