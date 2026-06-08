# PDF Master Pro

Site Next.js para ferramentas de PDF com prioridade em custo baixo, privacidade e deploy rápido na Vercel.

## O que já está funcional

As ferramentas abaixo rodam 100% no navegador com `pdf-lib`, sem enviar o PDF para a Vercel:

- Juntar PDF
- Dividir PDF
- Rotacionar PDF
- Marca d'água textual
- Compressão/otimização leve
- Numerar páginas
- Organizar (reordenar/duplicar/inverter páginas)
- JPG/PNG para PDF
- Assinar PDF com imagem (PNG/JPG)

## O que precisa de API externa

Estas funções rodam via [CloudConvert](https://cloudconvert.com/) (engine `qpdf`, `ocrmypdf` e conversores nativos):

- Proteger PDF com senha real
- Desbloquear PDF
- PDF para Word
- Word para PDF
- OCR PDF
- PDF para JPG

O arquivo **não passa pela Vercel**. A Vercel só cria e consulta o job; o upload e o download acontecem direto entre o navegador e o CloudConvert. Isso evita o limite de payload das Vercel Functions.

A chave da API fica **somente** em variável de ambiente do servidor, nunca no frontend.

### Fluxo arquitetural

```
Browser                Vercel (Next.js)            CloudConvert
   |                         |                          |
   |---- POST /create-job -->|                          |
   |    (tool, filename,     |                          |
   |     size, options)      |                          |
   |                         |--- POST /v2/jobs ------->|
   |                         |<--- { id, upload form }--|
   |<-- { jobId, uploadUrl, formData } ----------------|
   |                                                    |
   |---- POST uploadUrl (multipart, arquivo real) ----->|
   |                                                    |
   |---- GET /status?jobId=... -->|                     |
   |                              |--- GET /v2/jobs/X-->|
   |                              |<--- status ---------|
   |<--- status (poll a cada 2s)--|                     |
   |                                                    |
   |     (quando status === finished)                   |
   |---- GET downloadUrl direto do CloudConvert ------->|
   |<--- arquivo final ---------------------------------|
```

### Rotas API (apenas controle, nunca tráfego de arquivo)

- `POST /api/cloudconvert/create-job` — valida ferramenta/tamanho/opções, verifica a cota do visitante, cria job no CloudConvert e devolve `uploadUrl` + parâmetros do form para upload direto.
- `GET /api/cloudconvert/status?jobId=...` — consulta status; quando `finished`, devolve `downloadUrl` + `filename`.
- `GET /api/usage/anonymous` — devolve a cota atual do visitante (`limit`, `used`, `remaining`, `resetAt`) e aplica o cookie `pdfmp_anon_id` na primeira chamada.

## Controle de uso grátis (visitantes anônimos)

Visitantes sem cadastro podem usar as ferramentas de nuvem (protect, unlock, PDF ↔ Word, OCR, PDF → JPG) com um limite diário. O controle é aplicado no backend, dentro de `/api/cloudconvert/create-job`, antes de criar o job no CloudConvert.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ANON_DAILY_LIMIT` | `3` | Tarefas em ferramentas de nuvem permitidas por dia. |
| `ANON_MAX_FILE_MB` | `10` | Tamanho máximo aceito para visitantes anônimos. |
| `ANON_HASH_SALT` | (gerado em dev) | Sal para hashear `anonId` + IP + `user-agent` + `accept-language` + país. Defina um valor longo e aleatório em produção. |
| `UPSTASH_REDIS_REST_URL` | — | Endpoint REST do Upstash (https://console.upstash.com/). |
| `UPSTASH_REDIS_REST_TOKEN` | — | Token REST do Upstash. |

### Como o limite é calculado

O backend mantém três contadores diários por visitante (chave no Redis com TTL de 48h):

- `anon:{hash}:{YYYY-MM-DD}:count` — cookie `pdfmp_anon_id` (httpOnly, 180 dias, `sameSite=lax`, `secure` em prod).
- `ip:{hash}:{YYYY-MM-DD}:count` — IP do visitante (`x-forwarded-for` / `x-real-ip` / `x-vercel-forwarded-for`).
- `fp:{hash}:{YYYY-MM-DD}:count` — fingerprint combinando IP + `user-agent` + `accept-language` + país (`x-vercel-ip-country`).

A contagem efetiva é `max(anon, ip, fp)`. Se algum dos contadores atingir o limite, o job é bloqueado. A contagem só é **incrementada** depois que o job é criado no CloudConvert com sucesso, evitando cobrar por tentativas falhas.

Quando o limite é atingido, a API responde:

```json
{
  "error": "ANON_LIMIT_EXCEEDED",
  "message": "Você usou suas 3 tarefas grátis de hoje. Crie uma conta grátis para liberar mais tarefas ou assine o Premium.",
  "upgradeUrl": "/pricing",
  "usage": { "limit": 3, "used": 3, "remaining": 0, "resetAt": "2026-06-07T00:00:00.000Z" }
}
```

Para arquivos maiores que `ANON_MAX_FILE_MB`, a resposta é `413` com `error: "FILE_TOO_LARGE"` apontando para `/pricing`.

### Storage

- Em **produção**, é obrigatório ter Upstash Redis configurado (ou outro Redis compatível com a API REST do Upstash). Sem isso a rota responde `503 NOT_CONFIGURED`.
- Em **desenvolvimento**, se o Upstash não estiver configurado, um fallback in-memory é usado e emite um `console.warn` na inicialização. O estado se perde ao reiniciar o servidor — use apenas para testar.

A página `/pricing` mostra os planos atuais e o estado da cota.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
CLOUDCONVERT_API_KEY=seu_token_cloudconvert
# CLOUDCONVERT_API_URL=https://api.cloudconvert.com/v2  # opcional
ANON_HASH_SALT=$(openssl rand -hex 32)
ANON_DAILY_LIMIT=3
ANON_MAX_FILE_MB=10
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu_token
```

Gere sua chave CloudConvert em https://cloudconvert.com/dashboard/api/v2/keys.
Crie seu banco Upstash grátis em https://console.upstash.com/.

Sem `CLOUDCONVERT_API_KEY` configurada as rotas respondem com erro 503 e o frontend mostra a mensagem ao usuário. Sem `UPSTASH_REDIS_*` em produção, as rotas de nuvem também respondem 503.

## Instalação local

```bash
npm install
npm run dev
```

Abra:

```txt
http://localhost:3000
```

## Build de produção

```bash
npm run build
npm start
```

## Deploy na Vercel

1. Suba o projeto para o GitHub.
2. Entre na Vercel.
3. Clique em Add New Project.
4. Importe o repositório.
5. Framework: Next.js.
6. Em **Environment Variables**, adicione `CLOUDCONVERT_API_KEY` com a sua chave.
7. Clique em Deploy.

Para regenerar a chave, basta atualizar a variável em `Project → Settings → Environment Variables` e redeployar.

## Observações técnicas importantes

- As ferramentas locais (merge/split/rotate/watermark/compress/page-numbers/organize/jpg-to-pdf/sign) rodam 100% no navegador. Nada vai para a Vercel nem para a CloudConvert.
- Para as ferramentas CloudConvert, o arquivo vai **direto** do navegador para a CloudConvert (presigned upload). A Vercel Function só assina o job e consulta status — nunca recebe o arquivo. Isso resolve o limite de body das Vercel Functions e mantém custo baixo.
- Limite atual padrão por ferramenta CloudConvert: **50 MB** (configurável em `lib/cloudconvert.ts → CLOUD_TOOLS[...].maxSizeBytes`).
- O polling de status no frontend usa intervalo de 2s e timeout total de 5 minutos.
- Em caso de timeout ou erro, o usuário vê uma mensagem clara mas o job pode continuar no CloudConvert (créditos podem ser consumidos).
- `pdf-lib` é excelente para criar/modificar/copiar páginas, mas não é a escolha correta para criptografia real com senha — por isso protect/unlock usam CloudConvert.

## Login grátis e planos (Fase 3)

Visitantes sem cadastro continuam usando 3 tarefas/dia e 10 MB. Usuários com conta grátis ganham 5 tarefas/dia, 30 por mês e 20 MB. As ferramentas locais seguem sem limite em qualquer plano.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Conexão Prisma. SQLite em dev, Postgres em produção. |
| `NEXTAUTH_SECRET` | (gerar) | Segredo para assinar tokens JWT. `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | `http://localhost:3000` | URL pública do app. |

### Páginas e APIs

- `POST /api/auth/register` — cadastro com nome/e-mail/senha (mín. 8 chars), hash bcrypt, plano FREE, retorna 201 ou 409 (e-mail duplicado).
- `POST /api/auth/callback/credentials` — login via Auth.js v4 Credentials provider.
- `GET  /api/auth/session` — sessão atual (user.id, planCode, role).
- `GET  /api/usage/me` — uso do visitante ou do usuário logado.
- `POST /api/cloudconvert/create-job` — checa limite por tipo (visitante ou FREE user) e bloqueia antes de chamar CloudConvert.
- `GET  /login`, `GET  /register`, `GET  /account` — páginas de autenticação.

### Como o limite é decidido

`lib/usage.ts:getMyUsageStatus()` e `checkUsageLimit()` detectam automaticamente o estado de autenticação via `auth()` (NextAuth). Visitantes usam o caminho validado na Fase 2 (`lib/anonymous-usage.ts` com Upstash + fallback in-memory). Usuários logados usam `lib/usage-user.ts` que conta `UsageLog` por dia/mês no Postgres (via Prisma). O controle no `create-job` é feito **antes** da chamada ao CloudConvert — o teste manual valida que a 6ª chamada (logado) e a 4ª (visitante) são bloqueadas sem chamar o provedor.

### Banco de dados

- **Dev**: SQLite em `prisma/dev.db`. Rodar `npm install` (gera Prisma Client) e `npm run prisma:push` para criar as tabelas.
- **Produção**: Postgres. Defina `DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"` e rode `npm run prisma:push` (ou `prisma migrate deploy` em CI).

Modelos: `User`, `Account`, `Session`, `VerificationToken` (Auth.js), `Subscription` (preparado para Fase 4), `UsageLog` (auditoria de uso).

### Migração de anônimo para usuário

Quando o usuário loga, a contagem passa automaticamente a ser por `userId` (via `UsageLog`). O cookie anônimo `pdfmp_anon_id` continua sendo aplicado para visitantes não autenticados, sem migração obrigatória de histórico.

## Catálogo e planos (Fase 4)

A Fase 4 entrega o **catálogo completo de 29 ferramentas** classificadas por tier e exige um plano do visitante para usar cada uma. As 5 faixas de plano (`ANONYMOUS`, `FREE`, `PLUS`, `PREMIUM`, `ENTERPRISE`) são definidas em `lib/plans.ts` como fonte única de verdade; todas as checagens no backend e as descrições públicas de `/pricing` consomem esse arquivo.

### Catálogo (29 ferramentas)

| Categoria | Ferramentas | Tier mínimo |
| --- | --- | --- |
| Organizar PDF | Juntar, Dividir, Organizar, Numerar páginas, Girar, Marca d'água, Assinar | Básico |
| Otimizar PDF | Comprimir, Proteger, Desbloquear, OCR | Básico |
| Converter de PDF | PDF → JPG, PDF → Word, PDF → PowerPoint, PDF → Excel | Básico / Plus |
| Converter para PDF | JPG → PDF, Word → PDF, PowerPoint → PDF, Excel → PDF, HTML → PDF | Básico / Plus |
| Editar PDF | Cortar, Reparar | Básico (em breve) |
| Segurança PDF | Selo, Redigir (redact) | Plus / Premium |
| Avançado | Comparar, Formulários, Resumir com IA, Traduzir | Plus / Premium / Enterprise |

Todas as 29 ferramentas aparecem no catálogo público, no menu "Todas as ferramentas" do header e na home (com contagem dinâmica). As que ainda não estão implementadas exibem `Em breve` e o backend responde `409 TOOL_COMING_SOON` se forem chamadas.

### Planos (privados para o backend)

| PlanCode | Limites técnicos |
| --- | --- |
| `ANONYMOUS` | 3 tarefas/dia, 10 MB, somente ferramentas Básicas |
| `FREE` | 5 tarefas/dia, 30/mês, 20 MB, somente ferramentas Básicas |
| `PLUS` | 30 tarefas/dia, 300/mês, 250 MB, inclui Plus + Básicas |
| `PREMIUM` | 200 tarefas/dia, 2 000/mês, 1 GB, inclui Premium + Plus + Básicas |
| `ENTERPRISE` | Sem limite fixo, todas as ferramentas, SLA dedicado |

Esses números vivem em `lib/plans.ts` e **não** são expostos na página `/pricing` (que mostra apenas descrição pública, preço e features).

### Página /pricing

A página `/pricing` mostra 4 cards públicos — **Básico** (visitante), **Conta grátis**, **Plus** e **Premium** — mais o card **Empresarial** como "Sob consulta". Há um toggle **Mensal / Anual** com badge "Economize" no botão anual. Plus e Premium exibem preço principal em BRL e subtítulo em USD (ex.: `R$ 14,90 /mês` + `US$ 2.99 /mês`). Os botões de upgrade de Plus e Premium ficam como **"Em breve"** (disabled) porque o gateway de pagamento ainda não foi integrado.

### Bloqueios no backend

Todas as chamadas a `POST /api/cloudconvert/create-job` passam por `lib/can-use.ts:canUseTool()` antes de qualquer outra checagem. A função devolve códigos de erro tipados para a UI exibir mensagem e CTA:

| Código | HTTP | Significado |
| --- | --- | --- |
| `TOOL_NOT_FOUND` | 404 | Ferramenta desconhecida |
| `TOOL_COMING_SOON` | 409 | Ferramenta listada mas ainda não implementada |
| `TOOL_REQUIRES_PLUS` | 403 | Plano atual não cobre `minimumPlan = PLUS` |
| `TOOL_REQUIRES_PREMIUM` | 403 | Plano atual não cobre `minimumPlan = PREMIUM` |
| `TOOL_REQUIRES_ENTERPRISE` | 403 | Plano atual não cobre `minimumPlan = ENTERPRISE` |
| `FILE_TOO_LARGE` / `USER_FILE_TOO_LARGE` | 413 | Arquivo acima do `maxFileMb` do plano |

O frontend (`components/ApiToolWorkspace.tsx`) trata cada código com um bloco dedicado que mostra a mensagem e o link `/pricing` quando aplicável.

### Header e navegação

O `Header` agora tem dois níveis: a barra de categorias (`Organizar`, `Otimizar`, `Converter de PDF`, `Converter para PDF`, `Editar`, `Segurança`, `Avançado`) e um dropdown **"Todas as ferramentas ▾"** que abre um grid 2 colunas com as 29 ferramentas. Cada item mostra um `PlanBadge` com a cor do tier (slate/Básico, emerald/Conta grátis, indigo/Plus, red/Premium, violet/Empresarial).

### Validação automatizada

A suíte `run-tests-phase4.ps1` roda 23 verificações cobrindo:

- catálogo (29 ferramentas, páginas 200, /pricing com 4 cards, sem limites técnicos do Básico no HTML);
- cadastro + login + uso logado retorna `planCode: FREE`;
- usuário FREE chama `pdf-to-jpg` (Básico) → 201;
- usuário FREE chama `html-to-pdf` (Plus) → 403 `TOOL_REQUIRES_PLUS` (mock CloudConvert não recebe POST);
- usuário FREE chama `summarize-ai` (Premium coming_soon) → 409 `TOOL_COMING_SOON` (mock não recebe POST);
- usuário FREE chama `crop` (Básico coming_soon) → 409 `TOOL_COMING_SOON`;
- visitante anônimo chama `pdf-to-jpg` → 201, `html-to-pdf` → 403, `summarize-ai` → 409;
- usuário FREE chama `pdf-to-jpg` com 21 MB → 413 `USER_FILE_TOO_LARGE`.

Resultado: **23/23 OK** (ver `PHASE4-TEST-REPORT.txt`).

## Billing e assinaturas (Fase 5)

A Fase 5 substitui os botões "Em breve" da Fase 4 por um checkout real
com **Mercado Pago** (Brasil, Pix e cartão) e **Stripe Checkout** (resto
do mundo, cartão + Apple/Google Pay). Enterprise continua **"Sob
consulta"** — sem checkout, sem webhook, sem portal.

### Regras importantes

- **Plano só é ativado por webhook.** O simples retorno do usuário à
  `success_url` não muda `User.planCode`. A ativação acontece quando o
  webhook chega com `status="approved"/"paid"` (MP) ou com os eventos
  `checkout.session.completed` / `invoice.paid` (Stripe).
- **Segredos nunca vão para o frontend.** `MERCADO_PAGO_ACCESS_TOKEN` e
  `STRIPE_SECRET_KEY` ficam apenas em variáveis do servidor. O bundle do
  cliente não contém token nem URL secreta.
- **Nenhum teste anterior foi removido.** `tests/phase4/` continua
  intacto. A nova suíte `tests/phase5/` cobre o billing.
- **Fase 2 (anônimo + limite) e Fase 3 (Auth.js + Prisma) seguem
  intactas** — billing não toca em `lib/anonymous-usage.ts`,
  `lib/usage-user.ts` nem no controle de cota.

### Endpoints novos

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/billing/checkout` | Cria `Payment` (status `pending`), cria preferência/checkout no gateway e devolve `{ checkoutUrl }`. Requer login. |
| `GET`  | `/api/billing/status` | Devolve `{ plan, subscription, payments }` do usuário logado. |
| `POST` | `/api/webhooks/mercado-pago` | Recebe IPN do MP. Valida HMAC, marca `Payment` como `succeeded`/`failed` e ativa/cancela `Subscription`. |
| `POST` | `/api/webhooks/stripe` | Recebe eventos do Stripe. Valida assinatura, trata `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. |

### Páginas novas

- `/pricing` — toggle **Mensal / Anual** com selo "Economize", seletor
  **Brasil / Global**, e botão **"Contactar vendas"** para Enterprise.
- `/billing/status` — plano atual, status da assinatura, histórico de
  pagamentos e botão "Já paguei, verificar status".
- `/contact-sales` — formulário simples + e-mail
  `vendas@pdfmasterpro.com`.

### Variáveis de ambiente novas

```bash
APP_URL=http://localhost:3000
PAYMENT_PROVIDER_BR=mercadopago
PAYMENT_PROVIDER_GLOBAL=stripe
MERCADO_PAGO_API_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_WEBHOOK_SECRET=...
STRIPE_API_URL=https://api.stripe.com
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
BILLING_SKIP_WEBHOOK_SIG=1   # apenas dev/test
```

### Como rodar os testes

Em um terminal, suba o app em :3010 apontando para os mocks:

```bash
APP_URL=http://localhost:3010 NEXTAUTH_URL=http://localhost:3010 \
MERCADO_PAGO_API_URL=http://localhost:3600 \
STRIPE_API_URL=http://localhost:3700 \
MERCADO_PAGO_ACCESS_TOKEN=mock-mp-key \
STRIPE_SECRET_KEY=mock-stripe-key \
BILLING_SKIP_WEBHOOK_SIG=1 \
PORT=3010 npm run dev
```

Em outro terminal:

```bash
npm run test:phase4   # 27/27 esperado
npm run test:phase5   # billing
```

A suíte da Fase 5 sobe `tests/phase5/mock-mercado-pago.mjs` (porta 3600) e
`tests/phase5/mock-stripe.mjs` (porta 3700) automaticamente, e cobre 13
cenários: bloqueio sem login, login, checkout MP, checkout Stripe, status
pré-webhook, success_url **não** ativa, webhook MP ativa Plus, ferramenta
Plus liberada pós-ativação, webhook Stripe ativa Premium, rejeição MP,
Enterprise contact-sales, Em breve 409 e Básico 201.

Documentação completa em [`BILLING.md`](./BILLING.md).

## Estrutura principal

```txt
app/
  page.tsx
  api/
    auth/
      [...nextauth]/route.ts  (handler NextAuth v4)
      register/route.ts       (cadastro com bcrypt + zod)
    cloudconvert/
      create-job/route.ts     (cria job no CloudConvert + checa cota anon ou user)
      status/route.ts         (consulta status)
    usage/
      anonymous/route.ts      (consulta cota do visitante)
      me/route.ts             (consulta cota do usuario logado ou visitante)
  account/page.tsx            painel do usuario logado
  login/page.tsx              formulario de login
  register/page.tsx           formulario de cadastro
  pricing/page.tsx            server component fino que delega para PricingClient
  pricing/PricingClient.tsx   4 cards publicos + toggle mensal/anual + Enterprise "Sob consulta"
  ferramenta/
    merge/page.tsx            local (pdf-lib)
    split/page.tsx            local
    rotate/page.tsx           local
    watermark/page.tsx        local
    compress/page.tsx         local
    organize/page.tsx         local
    page-numbers/page.tsx     local
    jpg-to-pdf/page.tsx       local
    sign/page.tsx             local
    protect/page.tsx          CloudConvert
    unlock/page.tsx           CloudConvert
    pdf-to-word/page.tsx      CloudConvert
    word-to-pdf/page.tsx      CloudConvert
    ocr/page.tsx              CloudConvert
    pdf-to-jpg/page.tsx       CloudConvert
    [id]/page.tsx             catch-all (29 ferramentas, dispatch por tool.implemented/processingMode)
components/
  ApiToolWorkspace.tsx        fluxo create-job → upload direto → poll → download (trata TOOL_* e PLAN_LIMIT_EXCEEDED)
  AuthSessionProvider.tsx     SessionProvider do next-auth/react
  FutureToolWorkspace.tsx     placeholder para ferramentas em breve
  Header.tsx                  nav por categoria + dropdown "Todas as ferramentas"
  PlanBadge.tsx               badge clicável do tier (Básico/Plus/Premium/Empresarial)
  StatusBadge.tsx             Local/API/Em breve
  ToolCard.tsx                card da home (StatusBadge + PlanBadge + CTA)
  ToolPageLayout.tsx
  UploadDropzone.tsx
  ProcessingStatus.tsx
  ...
lib/
  browser-file.ts
  cloudconvert.ts             helper server-only + registry CLOUD_TOOLS (29 ferramentas, 7 com validate custom)
  anonymous-usage.ts          identidade visitante, Redis + fallback in-memory (lê de PLANS.ANONYMOUS)
  usage.ts                    orquestrador (anon vs user, integra canUseTool antes da cota)
  usage-user.ts               checagem/log por usuario logado (FREE/PREMIUM)
  usage-limits.ts             constantes legacy (lidas de PLANS via limitsFor)
  can-use.ts                  gate de plano/status/tamanho (TOOL_NOT_FOUND/COMING_SOON/REQUIRES_*/FILE_TOO_LARGE)
  plans.ts                    fonte única de verdade dos 5 planos (rank, limites, preços, publicFeatures)
  tools.ts                    29 ferramentas com minimumPlan/tier/badge/implemented/processingMode
  auth.ts                     NextAuth options + helpers
  prisma.ts                   PrismaClient singleton
prisma/
  schema.prisma               User, Account, Session, VerificationToken, Subscription, Payment, UsageLog
types/
  next-auth.d.ts              augmentacoes de tipo para Session/User/JWT
```

## Próxima fase recomendada (Fase 6)

1. E-mail transacional (Resend) para confirmação de cadastro, recibos e avisos de limite.
2. Política de privacidade (LGPD) explicando cookies, fingerprint e dados no Postgres.
3. Webhooks do CloudConvert para não depender de polling no navegador.
4. Console administrativo para visualizar uso, faturamento e abuso (mapa de `UsageLog` + Upstash).
5. Cupons, upgrade/downgrade no meio do ciclo e cálculo de prorrateamento (atualmente a Fase 5 não cobre).
6. Renovação automática de graça ("cortesia de 3 dias" é uma mitigação; precisa de cron).

## Fase 6 — Segurança, privacidade, retenção e homologação

A Fase 6 entrega:

- **Política pública de retenção**: "Processou, baixou, descartou. Não armazenamos seus arquivos permanentemente."
  Exibida na home, no Footer, em cada ferramenta local e em cada ferramenta em nuvem.
- **Delete-job pós-download**: `requestCleanup(jobId)` é disparado em background após o download, chamando
  `DELETE /v2/jobs/<jobId>` no CloudConvert. Se a limpeza falhar, o download não é bloqueado.
- **Rate limiting** por usuário logado e por visitante anônimo: `lib/rate-limit.ts` usa Upstash Redis
  (script Lua sliding window) com fallback in-memory para dev.
- **Páginas legais** em pt-BR:
  - [`/privacidade`](./app/privacidade/page.tsx) — dados coletados, pagamentos, retenção, LGPD.
  - [`/termos`](./app/termos/page.tsx) — uso permitido, abuso, ativação só via webhook, Enterprise sob contrato.
  - [`/seguranca`](./app/seguranca/page.tsx) — HTTPS, bcrypt, JWT, rate limit, o que não garantimos.
  - [`/cookies`](./app/cookies/page.tsx) — cookies técnicos, rate limit, o que não usamos.
  - [`/suporte`](./app/suporte/page.tsx) — e-mails, FAQ, cancelamento.
- **Cabeçalhos de segurança** em `next.config.mjs`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
  - `X-Powered-By` removido.
- **Validação de env em produção** via `lib/env.ts`: verifica `DATABASE_URL`, `NEXTAUTH_SECRET`,
  `NEXTAUTH_URL`, `ANON_HASH_SALT`, `CLOUDCONVERT_API_KEY`, `PAYMENT_PROVIDER_*`,
  `MERCADO_PAGO_*`, `STRIPE_*` em build de produção.
- **Documentação de deploy e produção**:
  - [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md) — passo a passo Vercel + Neon + Upstash + CloudConvert + MP + Stripe.
  - [`PRODUCTION-CHECKLIST.md`](./PRODUCTION-CHECKLIST.md) — checklist de 12 seções para subir em prod.
- **Test runner oficial**:
  ```bash
  npm run test:phase6
  ```
  Gera `PHASE6-TEST-REPORT.txt` com cobertura de páginas legais, footer, headers, delete-job, rate limit e smoke de fases anteriores.

O que a Fase 6 **não** entrega (intencionalmente, para manter o escopo honesto):
- SSO / SAML / OIDC corporativo.
- ISO 27001 ou SOC 2.
- Retenção de 2h ou área de arquivos salvos.
- Processamento regional certificado (LGPD/GDPR).
- E-mail transacional (Resend).

## Fase 7 — Homologação online (Vercel)

A Fase 7 entrega o **deploy de homologação** da aplicação na Vercel,
contra uma URL pública (preview ou production), com validação automatizada
via `npm run test:phase7`.

### O que a Fase 7 entrega

- **Test runner online** (`tests/phase7/test-phase7-homologation.mjs`):
  bate contra `HOMOLOGATION_BASE_URL` e valida 18 grupos de teste
  (páginas públicas, APIs de borda, cabeçalhos, ausência de segredos,
  webhooks não quebram com payload vazio).
  ```bash
  HOMOLOGATION_BASE_URL=https://<preview>.vercel.app npm run test:phase7
  ```
- **Documentação detalhada** de deploy em [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md)
  (Vercel, Neon, Upstash, CloudConvert, MP sandbox, Stripe test, domínio,
  webhooks, troubleshooting, estratégia de homologação).
- **Checklist de produção expandido** em [`PRODUCTION-CHECKLIST.md`](./PRODUCTION-CHECKLIST.md)
  (seção 13: 9 sub-seções cobrindo preview, banco, Upstash, CC, MP,
  Stripe, runner, smoke manual, promoção para prod).
- **Template de homologação** em [`HOMOLOGATION-REPORT.md`](./HOMOLOGATION-REPORT.md)
  para marcar cada item e servir de checkpoint antes de promover.
- **Relatório oficial** gerado em `PHASE7-HOMOLOGATION-REPORT.txt` após
  rodar o runner.
- **ZIP da Fase 7** em `pdf-master-pro-fase-7-homologacao-vercel.zip`
  com tudo da Fase 6 + os artefatos da Fase 7.

### O que a Fase 7 **não** entrega

- O deploy real na Vercel (requer conta, repositório conectado, chaves
  reais de MP/Stripe/CC — isso é feito pelo operador seguindo o
  `DEPLOY-VERCEL.md`).
- Smoke manual de pagamento (criação de checkout PLUS/PREMIUM com
  cartão/sandbox real). Isso é feito pelo operador após o runner
  automatizado passar.
- Promoção para domínio principal (só após homologação aprovada).

### Pré-requisitos para rodar a homologação

1. Conta Vercel com o projeto importado.
2. Banco Postgres (Neon recomendado) provisionado.
3. Upstash Redis provisionado.
4. CloudConvert com token de sandbox ou produção.
5. Mercado Pago em modo sandbox (`MERCADO_PAGO_SANDBOX=1`,
   `MERCADO_PAGO_ACCESS_TOKEN` de sandbox).
6. Stripe em test mode (`STRIPE_SECRET_KEY=sk_test_...`,
   `STRIPE_PUBLIC_KEY=pk_test_...`).

### Fluxo de homologação

1. Push para a branch de homologação → Vercel gera URL de preview.
2. Aguardar build "Ready" no painel da Vercel.
3. Rodar `test:phase7` contra a URL de preview.
4. Preencher `HOMOLOGATION-REPORT.md`.
5. Se aprovado: promover para produção.
6. Rodar `test:phase7` contra a URL de produção.
