# Guia Operacional de Homologacao (Fase 7)

Passo a passo pratico para o operador executar a homologacao do PDF Master Pro
na Vercel. **Siga na ordem**. Cada passo depende do anterior.

> **Aviso importante**: este guia NAO implementa nada novo. Ele existe para
> um humano (operador) executar a homologacao real com credenciais reais
> (Vercel, Neon, Upstash, CloudConvert, Mercado Pago, Stripe). Os
> arquivos `.env` com chaves **nunca** devem ir para o repositorio nem
> para o ZIP.

---

## 0. Pre-requisitos locais

- Node 20.x ou 22.x (LTS)
- npm 10.x ou superior
- Git configurado
- Acesso a internet
- Navegador moderno
- 1-2 horas de tempo ininterrupto

---

## 1. Restaurar o projeto a partir do ZIP

Extraia o conteudo do ZIP em uma pasta vazia. O ZIP contem a pasta
`pdf-master-pro/` na raiz.

```bash
# Windows (PowerShell)
Expand-Archive -LiteralPath ".\pdf-master-pro-fase-7-homologacao-vercel.zip" -DestinationPath ".\"

# macOS / Linux
unzip pdf-master-pro-fase-7-homologacao-vercel.zip
```

```bash
cd pdf-master-pro
ls
# Deve listar: app/  components/  lib/  prisma/  tests/  ...
```

> **NAO** copie nenhum `.env` antigo para esta pasta. Vamos criar um
> `.env.local` novo, limpo, sem nenhuma chave real.

---

## 2. Instalar dependencias

```bash
npm install
```

Resultado esperado: instala `next`, `react`, `pdf-lib`, `prisma`, etc.
Nenhum erro de versao.

---

## 3. Rodar validacao local

> Antes de mexer em qualquer credencial real, valide que a base esta saudavel.

```bash
npm run build
```

Resultado esperado: `Compiled successfully`, `Generating static pages (32/32)`,
lista de rotas. **Nenhum** `Type error`.

```bash
npm run test:phase4
```

Resultado esperado: `27 pass / 0 fail  ->  PHASE 4 OK` + relatorio em
`PHASE4-TEST-REPORT.txt`.

```bash
npm run test:phase5
```

Resultado esperado: `38 pass / 0 fail  ->  PHASE 5 OK` + relatorio em
`PHASE5-TEST-REPORT.txt`.

```bash
npm run test:phase6
```

Resultado esperado: `40 pass / 0 fail  ->  PHASE 6 OK` + relatorio em
`PHASE6-TEST-REPORT.txt`.

```bash
npm run test:phase7
```

Resultado esperado (sem URL definida):
```
ERRO: defina HOMOLOGATION_BASE_URL=https://sua-url.vercel.app
```

Isso eh **esperado** em ambiente local sem URL online. O runner so funciona
contra a URL da Vercel (passo 9).

**Se algum teste local falhar**: pare. Investigue. NAO faca deploy.

---

## 4. Criar contas e configurar servicos externos

Crie uma conta em cada servico. Para todos, use a **mesma regiao** quando
possivel (ex.: `us-east-1` ou `gru1`) e a **mesma conta de e-mail** para
rastreabilidade.

### 4.1 Vercel

1. Acesse https://vercel.com/signup
2. Crie conta (recomendo: "Continue with GitHub")
3. Conecte seu provedor Git (GitHub/GitLab/Bitbucket)
4. Nao crie projeto ainda (faremos no passo 8)

### 4.2 Neon (Postgres)

1. Acesse https://neon.tech
2. Crie projeto `pdf-master-pro-homolog`
3. Regiao: escolha `US East (Ohio)` ou `South America (Sao Paulo)` (gru1)
4. Em "Connection Details" copie a string:
   - Formato: `postgresql://<user>:<pass>@<host>.neon.tech/neondb?sslmode=require`
5. Salve em um lugar seguro (1Password / cofre). **NAO** cole em chat/email.

### 4.3 Upstash Redis

1. Acesse https://upstash.com
2. Crie database `pdf-master-pro-homolog`
3. Regiao: a mesma do Neon
4. Tipo: "Regional" (nao precisa de multi-region)
5. Em "REST Credentials" copie:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
6. Salve em um lugar seguro.

### 4.4 CloudConvert

1. Acesse https://cloudconvert.com/register
2. Crie conta
3. Em https://cloudconvert.com/api/v2/dashboard, clique "Create Token"
4. Nome: `pdf-master-pro-homolog`
5. Copie o token (so eh mostrado uma vez). Salve em um lugar seguro.

### 4.5 Mercado Pago (sandbox)

1. Acesse https://www.mercadopago.com.br/developers/panel
2. Crie aplicacao tipo "Pagamentos online" chamada `pdf-master-pro-homolog`
3. Em "Credenciais > Sandbox":
   - Copie `Public Key` (comeca com `APP_USR-` ou `TEST-`)
   - Copie `Access Token` (comeca com `TEST-` em sandbox)
4. Em "Webhooks":
   - Ainda nao cadastre. Faremos no passo 10 (depois do deploy preview)
5. Salve tudo em lugar seguro.

### 4.6 Stripe (test mode)

1. Acesse https://dashboard.stripe.com/register
2. Ative "Test mode" no topo do painel (toggle)
3. Em "Developers > API keys":
   - Copie `Secret key` (comeca com `sk_test_`)
   - Copie `Publishable key` (comeca com `pk_test_`)
4. Em "Developers > Webhooks":
   - Ainda nao cadastre. Faremos no passo 10
5. Salve tudo em lugar seguro.

### 4.7 Gerar segredos proprios

Estes dois valores sao gerados por voce mesmo (NAO vem de servico externo).

```bash
# NEXTAUTH_SECRET (32+ chars aleatorios)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ANON_HASH_SALT (16+ chars aleatorios)
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

Guarde os dois valores em um lugar seguro.

---

## 5. Lista de variaveis de ambiente para a Vercel

Voce vai colar **todos** esses valores em **Settings > Environment Variables**
do projeto na Vercel. **NAO** coloque no repositorio.

| Variavel | Valor de homologacao (preview) | Trocar em production? |
| --- | --- | --- |
| `APP_URL` | `https://<preview>.vercel.app` | sim (dominio final) |
| `DATABASE_URL` | connection string do Neon de homolog | sim (banco de prod) |
| `NEXTAUTH_URL` | `https://<preview>.vercel.app` | sim (dominio final) |
| `NEXTAUTH_SECRET` | valor gerado no passo 4.7 | NAO (pode manter) |
| `ANON_HASH_SALT` | valor gerado no passo 4.7 | NAO (pode manter) |
| `CLOUDCONVERT_API_KEY` | token do passo 4.4 (sandbox ou prod) | sim (se usou sandbox) |
| `CLOUDCONVERT_API_URL` | `https://api.cloudconvert.com/v2` | NAO |
| `UPSTASH_REDIS_REST_URL` | do passo 4.3 | NAO (mesmo banco) |
| `UPSTASH_REDIS_REST_TOKEN` | do passo 4.3 | NAO (mesmo banco) |
| `PAYMENT_PROVIDER_BR` | `mercado_pago` | NAO |
| `PAYMENT_PROVIDER_GLOBAL` | `stripe` | NAO |
| `MERCADO_PAGO_ACCESS_TOKEN` | `TEST-...` (sandbox, do passo 4.5) | sim (token de prod) |
| `MERCADO_PAGO_PUBLIC_KEY` | `TEST-...` (sandbox, do passo 4.5) | sim (public key de prod) |
| `MERCADO_PAGO_WEBHOOK_SECRET` | configurado no passo 10 | sim (novo secret de prod) |
| `MERCADO_PAGO_SANDBOX` | `1` | sim (`0` em prod) |
| `STRIPE_SECRET_KEY` | `sk_test_...` (do passo 4.6) | sim (`sk_live_...` de prod) |
| `STRIPE_PUBLIC_KEY` | `pk_test_...` (do passo 4.6) | sim (`pk_live_...` de prod) |
| `STRIPE_WEBHOOK_SECRET` | configurado no passo 10 | sim (novo secret de prod) |
| `BILLING_SKIP_WEBHOOK_SIG` | `1` (apenas para debug) | sim (`0` em prod) |
| `ENFORCE_PROD_ENV` | `0` | `1` (se quiser build rigoroso) |
| `NODE_ENV` | `production` (Vercel seta automatico) | `production` |

> **Em homologacao (preview)**: use sandbox MP (`TEST-...`, `MERCADO_PAGO_SANDBOX=1`)
> e test mode Stripe (`sk_test_...`, `pk_test_...`).
>
> **Em producao**: troque para tokens live/producao de ambos, coloque
> `MERCADO_PAGO_SANDBOX=0`, `BILLING_SKIP_WEBHOOK_SIG=0` e `ENFORCE_PROD_ENV=1`.

---

## 6. Diferenca Preview vs Production (resumo rapido)

| Item | Preview (homologacao) | Production |
| --- | --- | --- |
| Tokens MP | sandbox (`TEST-...`) | live (`APP_USR-...`) |
| `MERCADO_PAGO_SANDBOX` | `1` | `0` |
| Tokens Stripe | test (`sk_test_...`, `pk_test_...`) | live (`sk_live_...`, `pk_live_...`) |
| `BILLING_SKIP_WEBHOOK_SIG` | `1` (opcional, para debug) | `0` |
| `ENFORCE_PROD_ENV` | `0` | `1` |
| Banco (Neon) | projeto `pdf-master-pro-homolog` | projeto `pdf-master-pro` |
| Upstash | mesmo banco funciona | banco dedicado (recomendado) |
| Webhooks MP | apontam para `https://<preview>.vercel.app/api/webhooks/mercado-pago` | apontam para `https://<dominio>/api/webhooks/mercado-pago` |
| Webhooks Stripe | idem, com URL de preview | idem, com URL final |
| Dominio | `<preview>.vercel.app` (Vercel gera) | dominio customizado (CNAME/A) |

> **Regra de ouro**: nunca promova para production sem antes promover os
> tokens de sandbox para producao. **Nunca** use `sk_live_` em homologacao.

---

## 7. Comandos Prisma

Apos o primeiro deploy (passo 8) terminar com sucesso, voce precisa criar
as tabelas no banco de homologacao.

> **Quando executar**: depois que `DATABASE_URL` ja estiver configurado na
> Vercel e o build da Vercel ja tiver passado. O build da Vercel ja roda
> `prisma generate`, entao o cliente esta pronto. Falta **criar o schema**.

### 7.1 Executar localmente apontando para o banco remoto

```bash
# Em homologacao: use o mesmo DATABASE_URL do Neon de homolog.
# Voce pode colar o valor no .env.local temporariamente.

npx prisma db push
```

Resultado esperado: `Your database is now in sync with your Prisma schema.`
+ lista de tabelas criadas.

> **Alternativa mais conservadora** (recomendada para producao):
>
> ```bash
> npx prisma migrate dev --name init
> npx prisma migrate deploy
> ```
>
> Mas o `db push` eh suficiente para homologacao. Use `migrate` quando
> quiser versionar o schema.

### 7.2 Verificar

```bash
npx prisma studio
```

Abra o Prisma Studio no navegador, confira que existem as tabelas:
`User`, `Account`, `Session`, `VerificationToken`, `Subscription`,
`Payment`, `UsageLog`.

Feche o Studio (Ctrl+C no terminal).

### 7.3 Limpar `.env.local`

Se voce colou o `DATABASE_URL` real no `.env.local` apenas para rodar
`prisma db push`, **apague esse arquivo agora**:

```bash
rm .env.local
# ou no PowerShell:
Remove-Item -LiteralPath .env.local
```

Ele NAO deve ir para o repositorio nem para o ZIP. (O `.gitignore`
ja ignora, mas eh boa pratica manter limpo.)

---

## 8. Deploy na Vercel

### 8.1 Importar o repositorio

1. Acesse https://vercel.com/new
2. Selecione o repositorio do PDF Master Pro
3. "Framework Preset": **Next.js** (autodetectado)
4. "Root Directory": deixe em branco (o projeto esta na raiz)
5. "Build Command": `prisma generate && next build`
6. "Install Command": `npm ci`
7. "Output Directory": deixe em branco

### 8.2 Configurar as variaveis de ambiente

Em "Environment Variables", adicione **cada** uma das 18 variaveis da
tabela do passo 5.

Para cada variavel:
- Cole o valor no campo "Value"
- Em "Environments", marque: Production, Preview, Development
  (exceto as que NAO devem ir em Development, ex.: tokens reais)
- Clique "Add"

> **Dica**: a Vercel aceita que voce cole varias de uma vez via interface
> de "bulk add" ou via CLI. Para muitas vars, use `vercel env add`.

### 8.3 Primeiro deploy (Preview)

1. Selecione a branch de homologacao (ex.: `fase-7-homolog` ou `main`
   se quiser). **Recomendado**: criar uma branch `homolog` separada.
2. Clique "Deploy"
3. Aguarde. Tempo esperado: 2-5 minutos.
4. Resultado: status "Ready" + URL do tipo
   `https://pdf-master-pro-git-homolog.vercel.app`

### 8.4 Capturar a URL

Anote a URL de preview. Exemplo:
```
URL de homologacao: https://pdf-master-pro-git-homolog.vercel.app
```

---

## 9. Rodar o teste online (test:phase7)

Abra um terminal **na pasta do projeto** (com `node_modules` ja instalado)
e rode:

```bash
HOMOLOGATION_BASE_URL=https://pdf-master-pro-git-homolog.vercel.app npm run test:phase7
```

Substitua pela URL real do passo 8.4.

Resultado esperado: `33 pass / 0 fail  ->  PHASE 7 OK`.

O relatorio `PHASE7-HOMOLOGATION-REPORT.txt` eh gerado na raiz do projeto
local com timestamp.

**Se algum teste falhar**: investigue. NAO pule. NAO faca smoke manual
antes do runner passar.

---

## 10. Configurar webhooks

### 10.1 Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers/panel
2. Selecione a aplicacao `pdf-master-pro-homolog`
3. Va em "Webhooks > Configurar notificacoes"
4. URL: `https://pdf-master-pro-git-homolog.vercel.app/api/webhooks/mercado-pago`
5. Eventos: marque `payment`, `subscription_preapproval`,
   `subscription_preapproval_plan`
6. Salve
7. Copie o **webhook secret** que o MP exibir
8. Na Vercel, adicione/edite a env `MERCADO_PAGO_WEBHOOK_SECRET` com esse valor
9. **Redeploy** o projeto na Vercel (basta um push vazio ou "Redeploy" no painel)

### 10.2 Stripe

1. Acesse https://dashboard.stripe.com/test/webhooks
2. Clique "Add endpoint"
3. URL: `https://pdf-master-pro-git-homolog.vercel.app/api/webhooks/stripe`
4. Eventos: marque `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`
5. Salve
6. Copie o **Signing secret** (`whsec_...`)
7. Na Vercel, adicione/edite a env `STRIPE_WEBHOOK_SECRET` com esse valor
8. **Redeploy** o projeto na Vercel

### 10.3 Validar webhooks

Use o "Send test event" de cada provedor:
- **MP**: Developers > Webhooks > "Testar" (envia `payment` approved)
- **Stripe**: Developers > Webhooks > "Send test event" (escolha
  `checkout.session.completed`)

Em ambos, abra os logs da Vercel (Deployments > clique no deploy >
"Logs") e procure pelo `POST /api/webhooks/...` retornando 200.

---

## 11. Smoke test manual

Abra a URL de homologacao no navegador. Faca cada item abaixo.

### 11.1 Visitante anonimo

1. Abra `https://<preview>.vercel.app/` em aba anonima
2. Verifique que a home carrega com o catalogo
3. Tente `/ferramenta/merge` e junte 2 PDFs (deve funcionar)
4. Use `/ferramenta/protect` com um PDF pequeno (deve funcionar,
   consome o limite diario anonimo)
5. Repita varias vezes ate bater o limite anonimo
6. Verifique que aparece mensagem de "limite atingido"
7. Tente uma ferramenta Plus anonimamente: deve dar 403

### 11.2 Cadastro e login

1. Clique em "Cadastrar" / "Criar conta"
2. Crie `homolog+<timestamp>@example.com` com senha forte
3. Verifique que login funcionou e o usuario aparece em `/account`
4. Faca logout

### 11.3 Pagamento Mercado Pago sandbox (Plus)

1. Faca login novamente
2. Va em `/pricing` e clique "Assinar PLUS"
3. Escolha "Mensal" + "Brasil (BRL)"
4. Sera redirecionado para o checkout do MP
5. **Em sandbox**, use:
   - Pix: o proprio painel do MP mostra QR de teste
   - Cartao de teste MP: `4509 9535 6623 3704` (Master, qualquer
     data futura, qualquer CVV)
6. Confirme o pagamento
7. Volte para o app e va em `/account` ou `/billing/status`
8. Verifique que `User.planCode` agora eh `PLUS`
9. Volte a `/ferramenta/html-to-pdf` (Plus): agora deve funcionar
10. **Verifique nos logs da Vercel** que o webhook
    `/api/webhooks/mercado-pago` foi chamado e retornou 200

### 11.4 Pagamento rejeitado (sandbox)

1. Ainda logado, va em `/pricing` e clique "Assinar PLUS" de novo
2. Em sandbox, use cartao **rejeitado**: `4013 5406 8274 4460`
   ou o codigo de status "rejected" no painel
3. Verifique que o pagamento NAO ativou o plano
4. Plano continua `FREE` ou `PLUS` (caso ja tivesse ativado antes)

### 11.5 Pagamento Stripe test mode (Premium)

1. Va em `/pricing` e clique "Assinar PREMIUM"
2. Escolha "Anual" + "Global (USD)"
3. Sera redirecionado para o checkout do Stripe
4. Use cartao de teste Stripe: `4242 4242 4242 4242`, qualquer
   data futura, qualquer CVC, qualquer CEP
5. Confirme
6. Verifique que `User.planCode` agora eh `PREMIUM`

### 11.6 Pagamento rejeitado Stripe

1. Em `/pricing`, clique "Assinar PREMIUM" de novo
2. Use cartao **rejeitado**: `4000 0000 0000 0002` (generic decline)
3. Verifique que o plano NAO subiu

### 11.7 Delete-job

1. Faca upload de um PDF em `/ferramenta/protect` (CC tool)
2. Baixe o resultado
3. **Apos o download**, abra o DevTools do navegador (F12) > Network
4. Procure por `POST /api/cloudconvert/delete-job` com status 200
5. Opcional: confira no dashboard do CloudConvert (https://cloudconvert.com)
   que o job foi removido

### 11.8 Paginas legais

Abra cada uma em uma aba nova e confira que o conteudo esta em portugues,
sem promessas falsas (ISO, SOC 2, SSO), e que mencionam retencao:

- `/privacidade`
- `/termos`
- `/seguranca`
- `/cookies`
- `/suporte`

### 11.9 Headers de seguranca

1. Abra DevTools > Network
2. Clique em qualquer requisicao (ex.: a home)
3. Em "Response Headers", confirme:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
4. Confirme que `X-Powered-By` NAO aparece

### 11.10 Rate limit

1. Em um terminal, rode:
   ```bash
   for i in {1..15}; do
     curl -s -o /dev/null -w "%{http_code} " \
       -X POST -H "Content-Type: application/json" \
       -d '{"jobId":"rate-test-'$i'"}' \
       https://<preview>.vercel.app/api/cloudconvert/delete-job
   done
   echo
   ```
2. Resultado esperado: primeiros 10 retornam `200`, depois vem `429`.

---

## 12. Preencher HOMOLOGATION-REPORT.md

Abra o arquivo `HOMOLOGATION-REPORT.md` no projeto local e marque **cada**
item conforme voce foi validando.

```bash
# Editor
code HOMOLOGATION-REPORT.md
# ou
notepad HOMOLOGATION-REPORT.md
```

Cada `- [ ]` deve virar `- [x]`. Adicione observacoes no item 15.

Resultado final esperado: o item 14 deve ter **HOMOLOGACAO APROVADA**
marcado.

---

## 13. Promover para producao

> **SOMENTE** apos todos os 16 itens do passo 12 estarem marcados e o
> smoke manual ter passado 100%.

### 13.1 Trocar tokens de sandbox para producao

Na Vercel (em **Production** environment):

1. `MERCADO_PAGO_ACCESS_TOKEN`: troque de `TEST-...` para `APP_USR-...`
   (token live do MP)
2. `MERCADO_PAGO_PUBLIC_KEY`: troque de `TEST-...` para `APP_USR-...`
3. `MERCADO_PAGO_SANDBOX`: mude de `1` para `0`
4. `MERCADO_PAGO_WEBHOOK_SECRET`: troque para o secret do webhook
   cadastrado com a URL de producao
5. `STRIPE_SECRET_KEY`: troque de `sk_test_...` para `sk_live_...`
6. `STRIPE_PUBLIC_KEY`: troque de `pk_test_...` para `pk_live_...`
7. `STRIPE_WEBHOOK_SECRET`: troque para o secret do webhook cadastrado
   com a URL de producao
8. `BILLING_SKIP_WEBHOOK_SIG`: mude para `0` (validacao HMAC ativa)
9. `ENFORCE_PROD_ENV`: opcional, mude para `1` (build mais rigoroso)

### 13.2 Trocar banco para producao

1. Crie um **novo projeto no Neon** chamado `pdf-master-pro`
2. Copie a connection string e atualize `DATABASE_URL` na Vercel
3. Rode `npx prisma db push` contra o banco de producao

### 13.3 Atualizar URLs e webhooks

1. `APP_URL` = `https://<seu-dominio>.com` (sem barra no final)
2. `NEXTAUTH_URL` = mesmo
3. **Cadastre novamente** os webhooks do MP e Stripe apontando para
   a URL de producao (ou troque a URL dos webhooks existentes)
4. Copie os novos secrets e atualize `MERCADO_PAGO_WEBHOOK_SECRET` e
   `STRIPE_WEBHOOK_SECRET`

### 13.4 Promover o deploy

Na Vercel:
1. Va em "Deployments"
2. Pegue o ultimo deploy de preview que passou
3. Clique "Promote to Production"
4. Aguarde "Ready"

### 13.5 Configurar dominio customizado

1. Em "Settings > Domains", adicione `seu-dominio.com`
2. Siga instrucoes da Vercel para configurar DNS (CNAME ou A)
3. Aguarde a propagacao (ate 24h, normalmente minutos)
4. HTTPS eh automatico via Let's Encrypt

### 13.6 Rodar test:phase7 contra producao

```bash
HOMOLOGATION_BASE_URL=https://seu-dominio.com npm run test:phase7
```

Resultado esperado: `33 pass / 0 fail  ->  PHASE 7 OK` contra producao.

### 13.7 Smoke manual contra producao

Repita o passo 11 inteiro contra a URL final. Use cartoes de **teste** do
Stripe e do MP mesmo em producao se voce quiser validar sem cobrar
dinheiro real (essa eh a vantagem de manter a homolog como mirror).

### 13.8 Arquivar

Anexe ao PR / ticket de release:
- `PHASE4-TEST-REPORT.txt`
- `PHASE5-TEST-REPORT.txt`
- `PHASE6-TEST-REPORT.txt`
- `PHASE7-HOMOLOGATION-REPORT.txt`
- `HOMOLOGATION-REPORT.md` (preenchido)
- ZIP da fase 7

---

## Checklist final do operador

> Marque cada item conforme for executando.

- [ ] **Build Vercel Ready** — o deploy de preview terminou com status "Ready"
- [ ] **Banco conectado** — `prisma db push` criou todas as tabelas no Neon
- [ ] **Upstash conectado** — chamadas aparecem no painel do Upstash apos uso
- [ ] **CloudConvert conectado** — upload em `/ferramenta/protect` criou job no dashboard do CC
- [ ] **Mercado Pago sandbox OK** — pagamento aprovado ativou PLUS, rejeitado NAO ativou
- [ ] **Stripe test OK** — cartao `4242...` ativou PREMIUM, `4000-0002` NAO ativou
- [ ] **test:phase7 online OK** — `33 pass / 0 fail` contra a URL de preview
- [ ] **Paginas legais OK** — 5 paginas acessiveis, conteudo em pt-BR, sem promessas falsas
- [ ] **Headers de seguranca OK** — `X-Frame-Options`, `X-Content-Type-Options`,
      `Referrer-Policy`, `Permissions-Policy` presentes; `X-Powered-By` ausente
- [ ] **Nenhum segredo no repositorio** — `git status` nao mostra `.env`, `.env.local`,
      `dev.db`; ZIP da fase 7 verificado
- [ ] **Relatorio preenchido** — `HOMOLOGATION-REPORT.md` com todos os 16 itens
      marcados; item 14 = "HOMOLOGACAO APROVADA"
- [ ] **Smoke manual 100%** — todos os itens do passo 11 passaram
- [ ] **test:phase7 contra producao OK** — apos promocao, runner passou
- [ ] **Dominio customizado ativo** — DNS propagado, HTTPS funcionando
- [ ] **Webhooks de prod cadastrados** — MP e Stripe apontam para URL final
- [ ] **Tokens de prod ativos** — `MERCADO_PAGO_SANDBOX=0`, `STRIPE_SECRET_KEY=sk_live_...`

> **So promova para producao depois de marcar todos os itens acima.**

---

## Troubleshooting rapido

- **Build da Vercel falha com "Cannot find module '@prisma/client'"**:
  o build command nao esta com `prisma generate`. Corrija em
  Settings > General > Build Command para `prisma generate && next build`.
- **Webhook MP retorna 401**: `MERCADO_PAGO_WEBHOOK_SECRET` errado ou
  nao foi redeploy apos mudar. Verifique.
- **Webhook Stripe retorna 400**: payload nao tem a assinatura HMAC
  esperada. Verifique `STRIPE_WEBHOOK_SECRET` e faca "Send test event"
  novamente.
- **CloudConvert retorna 401**: token expirou. Regere em
  https://cloudconvert.com/api/v2/dashboard.
- **Upstash retorna 401**: token REST expirou. Regere no console Upstash.
- **Prisma "table does not exist"**: voce esqueceu de rodar
  `prisma db push` no banco de homolog. Rode agora.
- **test:phase7 falha em "sem auth -> 401" para billing/checkout**:
  isso eh OK se a Vercel respondeu 307 (redirect). O teste aceita 401/302/307.
- **Vercel 504 em ferramenta em nuvem**: o upload eh direto do
  navegador para o CC, entao 504 na Vercel eh raro. Se acontecer,
  tente novamente — pode ser CC lento.

Para mais detalhes, veja `DEPLOY-VERCEL.md` (secoes 1-12) e
`PRODUCTION-CHECKLIST.md` (secoes 1-13).
