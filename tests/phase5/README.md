# Testes oficiais da Fase 5 — Billing, assinaturas e webhooks

Esta pasta contém o **runner oficial** de testes da Fase 5 do PDF Master Pro.
Valida o fluxo completo de cobrança: checkout, pagamento, webhook,
ativação de plano e liberação de ferramentas Plus/Premium.

## Arquivos

| Arquivo | Papel |
|---|---|
| `test-phase5.mjs`       | Runner principal. Sobe os mocks, executa asserções e grava o relatório. |
| `mock-mercado-pago.mjs` | Mock do Mercado Pago em `http://localhost:3600`. Sub-processo do runner. |
| `mock-stripe.mjs`       | Mock do Stripe em `http://localhost:3700`. Sub-processo do runner. |
| `README.md`             | Este arquivo. |

## O que o runner valida

1. **Sem login não há checkout**
   - `POST /api/billing/checkout` sem sessão → **401 NOT_AUTHENTICATED**
2. **Cadastro e login grátis** (smoke test, reusa helpers de csrf + credentials)
3. **Checkout Mercado Pago** (FREE → Plus BRL)
   - `POST /api/billing/checkout { planCode: "PLUS", country: "BR", currency: "BRL" }`
   - Status 201, `provider = "mercado_pago"`, `checkoutUrl` e `paymentId` presentes
   - Mock MP recebe 1 chamada `POST /checkout/preferences`
4. **Checkout Stripe** (FREE → Premium USD)
   - `POST /api/billing/checkout { planCode: "PREMIUM", country: "GLOBAL", currency: "USD" }`
   - Status 201, `provider = "stripe"`, `checkoutUrl` presente
   - Mock Stripe recebe 1 chamada `POST /v1/checkout/sessions`
5. **Estado antes do webhook**
   - `GET /api/billing/status` retorna `planCode = "FREE"` e `subscription.status = "PENDING_PAYMENT"`
   - Há 2 pagamentos `pending` no histórico (Plus e Premium)
6. **`success_url` NÃO ativa plano sozinho**
   - Visitar `/billing/status?status=success` mantém `planCode = "FREE"` e `subscription.status = "PENDING_PAYMENT"`
7. **Webhook Mercado Pago aprovado** ativa PLUS
   - `POST /api/webhooks/mercado-pago` com `status = "approved"`
   - Resposta: `{ activated: true, planCode: "PLUS" }`
   - Próximo `GET /api/usage/me` retorna `planCode = "PLUS"`
8. **Ferramenta Plus liberada após ativação**
   - `POST /api/cloudconvert/create-job` com `tool: "html-to-pdf"` → **201**
9. **Webhook Stripe `checkout.session.completed`** ativa PREMIUM
   - `POST /api/webhooks/stripe` com `type: "checkout.session.completed"`
   - Resposta: `{ activated: true, planCode: "PREMIUM" }`
   - Próximo `GET /api/usage/me` retorna `planCode = "PREMIUM"`
10. **Webhook Mercado Pago rejeitado** não ativa plano
    - `status = "rejected"` → pagamento marcado como `failed`
11. **ENTERPRISE retorna contato**
    - `POST /api/billing/checkout { planCode: "ENTERPRISE" }` → **400 ENTERPRISE_CONTACT_ONLY** com `contactUrl: "/contact-sales"`
    - `GET /contact-sales` → 200
12. **Ferramentas "Em breve" continuam bloqueadas**
    - `summarize-ai` (Premium coming_soon) → **409 TOOL_COMING_SOON**
    - `crop` (Básico coming_soon) → **409 TOOL_COMING_SOON**
13. **Ferramentas Básico continuam funcionando**
    - `pdf-to-jpg` → **201**

## Como rodar

```bash
# 1) Suba o dev server em :3010 (em outro terminal)
npm run dev

# 2) Rode o teste (sobe os mocks sozinho)
npm run test:phase5
```

### Variáveis de ambiente

| Var              | Default                  | Uso |
|------------------|--------------------------|-----|
| `BASE_URL`       | `http://localhost:3010`  | URL do Next dev |
| `MP_MOCK_URL`    | `http://localhost:3600`  | Mock Mercado Pago |
| `STRIPE_MOCK_URL`| `http://localhost:3700`  | Mock Stripe |
| `REPORT_PATH`    | `<projeto>/PHASE5-TEST-REPORT.txt` | Onde gravar o relatório |
| `SKIP_MOCK`      | `0`                      | `1` = não tentar subir mocks locais |

### Configuração no `.env.local`

O `.env.local` precisa apontar os provedores para os mocks em dev e
fornecer as chaves fictícias:

```env
MERCADO_PAGO_API_URL=http://localhost:3600
MERCADO_PAGO_ACCESS_TOKEN=mock-mp-key
MERCADO_PAGO_WEBHOOK_SECRET=mock-mp-secret

STRIPE_API_URL=http://localhost:3700
STRIPE_SECRET_KEY=mock-stripe-key
STRIPE_WEBHOOK_SECRET=mock-stripe-secret

BILLING_SKIP_WEBHOOK_SIG=1
```

Em produção, remova `BILLING_SKIP_WEBHOOK_SIG=1` (ou defina como `0`) para
que a validação de assinatura dos webhooks seja obrigatória.

## Critério de aceite

- Build: `npm run build` passa sem erro.
- `npm run test:phase4` ainda passa (27/27) — Fase 4 não foi quebrada.
- `npm run test:phase5` passa: webhook ativa plano, success_url não ativa,
  Enterprise retorna /contact-sales, env ausente é avisado com 503.
- Relatório: `PHASE5-TEST-REPORT.txt` atualizado na raiz do projeto.
