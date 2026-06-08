# Deploy na Vercel — PDF Master Pro

Guia de deploy da Fase 6 em producao. A Vercel hospeda a aplicacao Next.js; servicos externos (banco, Upstash, CloudConvert, Mercado Pago, Stripe) sao configurados via variaveis de ambiente.

## 1. Criar o projeto

1. Conecte o repositorio GitHub/GitLab/Bitbucket na Vercel.
2. Framework Preset: **Next.js**.
3. Build Command: `prisma generate && next build` (configure em Settings > General > Build & Development).
4. Install Command: `npm ci`.
5. Output Directory: deixe em branco (Next.js gerencia).
6. Region: `gru1` (Sao Paulo) se o publico principal for Brasil, ou a regiao mais proxima dos usuarios finais.

## 2. Banco de dados (Postgres)

Recomendado: **Neon** (Postgres serverless, free tier suficiente para MVP).

1. Crie o projeto no Neon: https://neon.tech
2. Copie a connection string (com `?sslmode=require`).
3. Defina `DATABASE_URL` na Vercel com essa connection string.
4. Apos o primeiro deploy, rode as migracoes localmente apontando para a URL de producao:
   ```bash
   npx prisma db push
   ```
   Em producao, prefira `prisma migrate deploy` se voce tiver historico de migrations em `prisma/migrations/`.

## 3. Upstash Redis (rate limit)

Recomendado: **Upstash** (serverless, free tier suficiente).

1. Crie o database no Upstash: https://upstash.com
2. Em "REST Credentials", copie:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Cole na Vercel em Settings > Environment Variables.

> Sem Upstash, o app cai em rate-limit in-memory (util apenas em dev/single-instance). Em Vercel, o processo eh efemero, entao o in-memory nao protege contra abuso real.

## 4. CloudConvert (processamento em nuvem)

1. Crie conta: https://cloudconvert.com
2. Em "API", crie um token.
3. Defina:
   - `CLOUDCONVERT_API_KEY` = o token.
   - `CLOUDCONVERT_API_URL` = `https://api.cloudconvert.com/v2` (default).
4. Plano recomendado: depende do volume. Comece com o pacote 25h/mes e ajuste.

## 5. Mercado Pago (pagamentos BR)

1. Crie aplicacao: https://www.mercadopago.com.br/developers/panel
2. Em "Credenciais", copie:
   - **Production access token** (comeca com `APP_USR-`).
3. Defina:
   - `PAYMENT_PROVIDER_BR=mercado_pago`
   - `MERCADO_PAGO_ACCESS_TOKEN=<token de producao>`
   - `MERCADO_PAGO_SANDBOX=0`
4. **Webhooks**: ainda no painel do MP, cadastre o webhook:
   - URL: `https://SEU-DOMINIO.com/api/billing/webhook/mercadopago`
   - Eventos: `payment`, `subscription_preapproval`, `subscription_preapproval_plan`.
5. Apos salvar, copie o **webhook secret** exibido pelo Mercado Pago e defina:
   - `MERCADO_PAGO_WEBHOOK_SECRET=<secret>`.

> Para testes iniciais, use `MERCADO_PAGO_SANDBOX=1` e o access token de sandbox.

## 6. Stripe (pagamentos globais)

1. Crie conta: https://dashboard.stripe.com
2. Em "Developers > API keys", copie:
   - **Secret key** (comeca com `sk_live_` em modo live, `sk_test_` em modo test).
3. Defina:
   - `PAYMENT_PROVIDER_GLOBAL=stripe`
   - `STRIPE_SECRET_KEY=<secret key>`
4. **Webhooks**: em "Developers > Webhooks > Add endpoint":
   - URL: `https://SEU-DOMINIO.com/api/billing/webhook/stripe`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
5. Apos criar, copie o **Signing secret** (`whsec_...`) e defina:
   - `STRIPE_WEBHOOK_SECRET=<whsec_...>`.

> Para testes locais, use `stripe listen --forward-to localhost:3000/api/billing/webhook/stripe`.

## 7. NextAuth

- `NEXTAUTH_URL=https://SEU-DOMINIO.com` (obrigatorio em producao).
- `NEXTAUTH_SECRET=<32+ caracteres aleatorios>`. Gere com:
  ```bash
  openssl rand -base64 32
  ```

## 8. Salt de visitante anonimo

- `ANON_HASH_SALT=<string aleatoria de 16+ chars>`. Esse valor eh usado para hash do IP + User-Agent. Em producao, nao use o valor padrao de dev.

## 9. Dominio customizado

1. Em Vercel > Settings > Domains, adicione o seu dominio.
2. Configure o DNS conforme instrucoes da Vercel (CNAME ou A).
3. Atualize `APP_URL` e `NEXTAUTH_URL` para `https://SEU-DOMINIO.com`.
4. Atualize os webhooks do Mercado Pago e Stripe com a URL final.

## 10. Health checks

- A Vercel ja monitora uptime automaticamente.
- Voce pode adicionar `https://SEU-DOMINIO.com/api/health` (rota interna) para checagens customizadas.

## 11. Variaveis de ambiente completas (referencia)

| Variavel | Obrigatoria em prod? | Descricao |
| --- | --- | --- |
| `APP_URL` | sim | URL publica do app |
| `DATABASE_URL` | sim | Postgres connection string |
| `NEXTAUTH_URL` | sim | URL do app (mesmo valor de APP_URL) |
| `NEXTAUTH_SECRET` | sim | Segredo do NextAuth |
| `ANON_HASH_SALT` | sim | Salt para hash de visitantes anonimos |
| `CLOUDCONVERT_API_KEY` | sim | Token da API CloudConvert |
| `CLOUDCONVERT_API_URL` | nao | Default: `https://api.cloudconvert.com/v2` |
| `UPSTASH_REDIS_REST_URL` | recomendado | Endpoint REST do Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | recomendado | Token REST do Upstash |
| `PAYMENT_PROVIDER_BR` | sim | `mercado_pago` |
| `PAYMENT_PROVIDER_GLOBAL` | sim | `stripe` |
| `MERCADO_PAGO_ACCESS_TOKEN` | sim | Access token de producao |
| `MERCADO_PAGO_WEBHOOK_SECRET` | sim (a menos que BILLING_SKIP_WEBHOOK_SIG=1) | Segredo do webhook |
| `MERCADO_PAGO_SANDBOX` | nao | `1` em sandbox, `0` em prod |
| `STRIPE_SECRET_KEY` | sim | Secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | sim (a menos que BILLING_SKIP_WEBHOOK_SIG=1) | Signing secret do webhook |
| `BILLING_SKIP_WEBHOOK_SIG` | nao | `1` desabilita validacao HMAC (apenas dev) |
| `ENFORCE_PROD_ENV` | nao | `1` faz o build falhar se envs de prod faltarem |

## 12. Apos o deploy

 1. Smoke test: criar conta gratis, juntar 2 PDFs, assinar PLUS (em sandbox), cancelar.
2. Conferir logs na Vercel para webhooks do MP e Stripe.
3. Rodar `npm run test:phase4`, `npm run test:phase5` e `npm run test:phase6` localmente.
4. Se precisar de suporte adicional, escreva para suporte@pdfmasterpro.com.

---

## Fase 7 — Homologação online

A Fase 7 adiciona um runner de homologacao que testa a aplicacao **online**,
contra a URL de preview ou production na Vercel. Ele NAO sobe mocks locais
e NAO precisa de credenciais (testa apenas o que esta exposto publicamente).

### Fluxo recomendado

1. **Deploy de preview primeiro**: o Vercel cria uma URL temporaria
   `https://<projeto>-git-<branch>.vercel.app` para cada push.
2. **Rodar o homolog contra preview**:
   ```bash
   HOMOLOGATION_BASE_URL=https://pdf-master-pro-git-fase-7.vercel.app npm run test:phase7
   ```
3. **Se o homolog passou**: promover para production ou apontar dominio
   customizado.
4. **Rodar o homolog contra production**:
   ```bash
   HOMOLOGATION_BASE_URL=https://pdf-master-pro.vercel.app npm run test:phase7
   ```
5. **Testes manuais finais** (NAO automatizados porque dependem de
   credenciais reais): criar conta, assinar PLUS em sandbox, cancelar.

### O que o homolog online NAO testa (e por que)

- **Fluxo end-to-end de pagamento** (criar checkout, pagar, webhook
  ativar plano): o runner nao tem acesso aos tokens de sandbox do MP
  ou Stripe. Esses fluxos ja sao cobertos pelo `test:phase5` local
  contra os mocks. Em homologacao, **use o painel de sandbox de cada
  provedor** para disparar webhooks de teste:

  - **Mercado Pago**: Developers > Webhooks > "Testar" (envia evento
    fake). Verifique nos logs da Vercel que `/api/webhooks/mercado-pago`
    retornou 200.
  - **Stripe**: Developers > Webhooks > "Send test event" (envia um
    `checkout.session.completed` fake). Verifique nos logs da Vercel
    que `/api/webhooks/stripe` retornou 200.

- **CloudConvert real**: o runner nao dispara uploads porque isso
  consome quota da conta CC. Para validar manualmente, abra
  `/ferramenta/protect` na URL de homologacao, faca upload de um PDF
  pequeno, defina uma senha, baixe o resultado e confira em
  `/api/usage/me` que o contador subiu.

- **Upstash/Redis**: o runner nao dispara carga de rate limit (isso
  precisa de muitas chamadas e polui as metricas). Para validar, abra
  o painel do Upstash apos 1-2 minutos de uso e veja se ha chamadas
  sendo feitas.

### Estrategia de webhooks em homologacao

Em homologacao, voce tem duas opcoes:

1. **Apontar webhooks para a URL de preview**: util para testar
   o fluxo completo. O webhook do MP e do Stripe aceitam URLs custom.
   Cuidado: troque de volta antes do deploy final em producao.
2. **Manter webhooks em producao e usar "Send test event"**: o runner
   so testa os endpoints publicos (ele nao dispara webhooks reais).
   Use a ferramenta de teste do provedor.

Recomendamos a opcao 2 para nao misturar URLs.

### Promocao para producao

Apos o homolog contra preview passar:

1. **Atualize `APP_URL` e `NEXTAUTH_URL`** para a URL final.
2. **Atualize os webhooks** do MP e Stripe para apontarem para a URL final.
3. **Tire as flags de sandbox** (se voce usou `MERCADO_PAGO_SANDBOX=1` ou
   `STRIPE_SECRET_KEY=sk_test_...`, troque para `MERCADO_PAGO_SANDBOX=0`
   e `STRIPE_SECRET_KEY=sk_live_...`).
4. **Confirme `BILLING_SKIP_WEBHOOK_SIG=0`** (validacao HMAC ativa).
5. **Faca o deploy em production** (merge na branch `main` ou clique
   "Promote to Production" no painel da Vercel).
6. **Rode o homolog contra production** (mesmo comando do item 4 do
   fluxo recomendado).
7. **Rode o homolog novamente 1-2 horas depois** para confirmar
   estabilidade.

### Troubleshooting comum

- **Build falha com `[env] Variavel obrigatoria faltando`**: voce esqueceu
  de setar uma env na Vercel. Veja a secao "Variaveis de ambiente
  completas" acima. Para forcar o build a falhar com mensagem clara,
  defina `ENFORCE_PROD_ENV=1`.

- **Webhook retorna 401**: a assinatura HMAC falhou. Confirme que
  `MERCADO_PAGO_WEBHOOK_SECRET` e `STRIPE_WEBHOOK_SECRET` estao com
  o valor **correto** (copie do painel do provedor, sem espacos extras).
  Em ultimo caso, defina `BILLING_SKIP_WEBHOOK_SIG=1` **apenas para
  debugar** (nao deixe em producao).

- **CloudConvert retorna 401**: o token expirou ou foi revogado. Gere
  um novo em https://cloudconvert.com/api/v2/dashboard.

- **Upstash retorna 401**: o token REST expirou. Regere em
  https://console.upstash.com > seu database > "REST Credentials".

- **Vercel timeout 504 em ferramenta em nuvem**: o upload do usuario
  eh direto para o CloudConvert, entao o timeout da Vercel nao deve
  ser problema. Se acontecer, o CC pode estar lento; tente novamente.
