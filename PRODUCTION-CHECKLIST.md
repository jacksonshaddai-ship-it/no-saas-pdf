# Production Checklist — PDF Master Pro (Fase 6)

Checklist obrigatorio antes de subir a aplicacao em producao. Marque cada item conforme for completando.

## 1. Dominio e HTTPS

- [ ] Dominio customizado configurado na Vercel.
- [ ] HTTPS ativo e forcado (HSTS ja vem da Vercel).
- [ ] `APP_URL` aponta para o dominio com `https://`.
- [ ] `NEXTAUTH_URL` igual a `APP_URL`.

## 2. Banco de dados

- [ ] Postgres provisionado (Neon recomendado).
- [ ] `DATABASE_URL` configurado com `?sslmode=require`.
- [ ] `npx prisma db push` (ou `migrate deploy`) executado no banco de producao.
- [ ] Backup automatico habilitado no provedor do banco.

## 3. Variaveis de ambiente

- [ ] `NEXTAUTH_SECRET` gerado com `openssl rand -base64 32` (32+ chars).
- [ ] `ANON_HASH_SALT` com valor aleatorio proprio (nao usar `dev-anon-salt`).
- [ ] `CLOUDCONVERT_API_KEY` com token de producao.
- [ ] `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` configurados (rate limit real).
- [ ] `PAYMENT_PROVIDER_BR=mercado_pago` e `PAYMENT_PROVIDER_GLOBAL=stripe`.
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` com token de producao (`APP_USR-...`).
- [ ] `MERCADO_PAGO_WEBHOOK_SECRET` configurado.
- [ ] `MERCADO_PAGO_SANDBOX=0` (desativar sandbox em producao).
- [ ] `STRIPE_SECRET_KEY` com `sk_live_...` (nao `sk_test_...`).
- [ ] `STRIPE_WEBHOOK_SECRET` (`whsec_...`) configurado.
- [ ] `BILLING_SKIP_WEBHOOK_SIG=0` (validacao HMAC ativa).
- [ ] `ENFORCE_PROD_ENV=1` (opcional, faz build falhar se envs faltarem).

## 4. Webhooks

- [ ] Webhook do Mercado Pago cadastrado em `https://SEU-DOMINIO/api/billing/webhook/mercadopago` com eventos `payment` e `subscription_*`.
- [ ] Webhook do Stripe cadastrado em `https://SEU-DOMINIO/api/billing/webhook/stripe` com eventos de checkout, subscription e invoice.
- [ ] Testar ambos os webhooks (gerar evento de teste no painel de cada provedor) e ver nos logs da Vercel.
- [ ] Webhook responses estao retornando 200; nenhum 401/400 nos logs.

## 5. Paginas legais

- [ ] `/privacidade` publicada e revisada.
- [ ] `/termos` publicada e revisada.
- [ ] `/seguranca` publicada.
- [ ] `/cookies` publicada.
- [ ] `/suporte` publicada.
- [ ] Footer da home e de ferramentas tem links para todas elas.
- [ ] E-mails de contato (`privacidade@`, `suporte@`, `comercial@`, `seguranca@`) existem e sao monitorados.

## 6. Politica de arquivos

- [ ] Mensagem "Processou, baixou, descartou. Nao armazenamos seus arquivos permanentemente." visivel na home e nas ferramentas.
- [ ] Privacy banner nas ferramentas em nuvem explica que o arquivo eh enviado direto para o provedor de processamento.
- [ ] Ferramentas locais exibem mensagem "processado no seu navegador".
- [ ] `requestCleanup(jobId)` chamado apos download nas ferramentas em nuvem.
- [ ] Rota `/api/cloudconvert/delete-job` testada e com rate limit ativo.

## 7. Seguranca

- [ ] Cabecalhos de seguranca configurados em `next.config.mjs`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrito.
- [ ] `poweredByHeader: false` (remove `X-Powered-By: Next.js`).
- [ ] Cookies de sessao sao `HttpOnly` e `Secure` em producao (ja vem do NextAuth).
- [ ] Senhas com bcrypt (validar em `prisma/seed.ts` se existir; senao confirmar pelo hash no DB).
- [ ] Webhooks validam assinatura HMAC (exceto se `BILLING_SKIP_WEBHOOK_SIG=1`).
- [ ] Nenhum segredo em codigo. Nenhum `.env` commitado. Confirmar com `git grep -i secret` (deve estar vazio) e `git status` (sem `.env*` no staged).

## 8. Testes

- [ ] `npm run build` passa sem warnings de TypeScript.
- [ ] `npm run test:phase4` passa (27/27).
- [ ] `npm run test:phase5` passa (38/38).
- [ ] `npm run test:phase6` passa (legal pages, footer links, delete-job, headers).
- [ ] `PHASE6-TEST-REPORT.txt` gerado e anexado ao deploy.

## 9. Deploy

- [ ] Branch `main` deployado.
- [ ] Vercel mostra "Build successful".
- [ ] Health check em `https://SEU-DOMINIO/` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/pricing` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/privacidade` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/termos` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/seguranca` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/cookies` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/suporte` retorna 200.
- [ ] Health check em `https://SEU-DOMINIO/api/health` retorna 200 (se existir).

## 10. Smoke test de pagamento

- [ ] Criar conta gratis.
- [ ] Tentar pagar PLUS via Mercado Pago **em sandbox** (se ainda nao habilitou producao) e verificar que o plano foi ativado via webhook.
- [ ] Tentar pagar PREMIUM via Stripe **em modo test** (`sk_test_...`) e verificar que o plano foi ativado.
- [ ] Cancelar a assinatura e ver o downgrade ao fim do ciclo.
- [ ] Tentar um pagamento rejeitado (cartao de teste `4000 0000 0000 0002` no Stripe) e ver que a conta nao foi ativada.

## 11. Monitoramento

- [ ] Vercel Analytics ativo.
- [ ] Logs da Vercel monitorados (webhook 401/500 devem ser investigados).
- [ ] Email de `seguranca@pdfmasterpro.com` configurado e testado.
- [ ] Email de `suporte@pdfmasterpro.com` configurado e testado.

## 12. Repositorio e artefatos

- [ ] `git status` limpo (sem `.env*`, sem `*.db`).
- [ ] `.gitignore` cobre: `node_modules`, `.next`, `*.db`, `*.log`, `.env*`.
- [ ] ZIP da fase 6 gerado em `pdf-master-pro-fase-6-seguranca-homologacao.zip` (sem `node_modules`, sem `.env*`, sem `*.db`).
- [ ] `PHASE6-TEST-REPORT.txt` anexado ao PR/issue de release.

---

## 13. Fase 7 — Homologacao online (Vercel)

Checklist para validar o deploy de homologacao. Marque cada item.

### 13.1 Deploy de preview

- [ ] Branch de homologacao pushed para o repositorio.
- [ ] Vercel detectou e criou deploy de preview automaticamente.
- [ ] Build na Vercel passou (status "Ready").
- [ ] URL de preview conhecida (ex.: `https://<projeto>-git-<branch>.vercel.app`).

### 13.2 Banco de dados (Postgres/Neon)

- [ ] `DATABASE_URL` configurado na Vercel com connection string do Neon.
- [ ] `prisma db push` (ou `migrate deploy`) executado no banco de homologacao.
- [ ] Smoke: o endpoint `/api/usage/me` responde 200 e cria o cookie `pdfmp_anon_id`.

### 13.3 Upstash Redis

- [ ] `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` configurados.
- [ ] Painel do Upstash mostra chamadas sendo feitas quando o app recebe trafego.
- [ ] Rate limit funciona: rodar 30 requests no `/api/cloudconvert/delete-job`
      e ver o 30o retornar 429.

### 13.4 CloudConvert

- [ ] `CLOUDCONVERT_API_KEY` configurado (sandbox ou producao).
- [ ] Smoke: abrir `/ferramenta/protect` na URL de homologacao, enviar PDF
      pequeno, ver o job criado no dashboard do CC.
- [ ] delete-job: apos o download, conferir no `/__deletes` (se mock) ou
      no dashboard do CC (se real) que o job foi removido.

### 13.5 Mercado Pago (sandbox)

- [ ] `MERCADO_PAGO_ACCESS_TOKEN` de sandbox configurado.
- [ ] `MERCADO_PAGO_WEBHOOK_SECRET` configurado.
- [ ] `MERCADO_PAGO_SANDBOX=1` em homologacao.
- [ ] Webhook cadastrado no painel do MP apontando para
      `https://<preview>/api/webhooks/mercado-pago` (ou use "Send test event").
- [ ] Smoke: criar checkout, simular pagamento aprovado no sandbox,
      ver `User.planCode` subir para `PLUS` no banco.
- [ ] Smoke: simular pagamento rejeitado, ver `User.planCode` continuar `FREE`.

### 13.6 Stripe (test mode)

- [ ] `STRIPE_SECRET_KEY` de test mode configurado (`sk_test_...`).
- [ ] `STRIPE_WEBHOOK_SECRET` configurado.
- [ ] Webhook cadastrado no painel do Stripe apontando para
      `https://<preview>/api/webhooks/stripe` (ou use "Send test event").
- [ ] Smoke: criar checkout Premium, usar cartao `4242 4242 4242 4242`,
      ver `User.planCode` subir para `PREMIUM`.
- [ ] Smoke: usar cartao `4000 0000 0000 0002` (rejected), ver plano
      continuar `FREE`.

### 13.7 Test runner automatizado

- [ ] `HOMOLOGATION_BASE_URL=https://<preview>.vercel.app npm run test:phase7`
      retorna `PHASE 7 OK` (40 pass / 0 fail ou 18 grupos de teste sem falha).
- [ ] `PHASE7-HOMOLOGATION-REPORT.txt` gerado e anexado ao PR.

### 13.8 Test runner local contra homologacao

- [ ] `npm run test:phase4` continua passando localmente (27/27).
- [ ] `npm run test:phase5` continua passando localmente (38/38).
- [ ] `npm run test:phase6` continua passando localmente (40/40).
- [ ] `npm run build` continua passando localmente (32 paginas).

### 13.9 Promocao para producao

- [ ] Preview homolog validado (todos os itens acima).
- [ ] `APP_URL` e `NEXTAUTH_URL` apontando para a URL final.
- [ ] Webhooks do MP e Stripe atualizados para a URL final.
- [ ] `MERCADO_PAGO_SANDBOX=0` em producao.
- [ ] `STRIPE_SECRET_KEY=sk_live_...` em producao.
- [ ] `BILLING_SKIP_WEBHOOK_SIG=0` em producao.
- [ ] Production deploy feito.
- [ ] `HOMOLOGATION_BASE_URL=https://<production>.com npm run test:phase7`
      retorna `PHASE 7 OK` contra production.
- [ ] Dominio principal configurado na Vercel e DNS propagado.
- [ ] HTTPS ativo e forcado.
