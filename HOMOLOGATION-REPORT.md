# Relatorio de Homologacao (Fase 7)

Use este arquivo para registrar o resultado do deploy de homologacao na
Vercel. Ele eh o "checkpoint" da Fase 7 antes de promover para producao
e antes de avancar para Fase 8.

## Identificacao

- **Data do deploy**:  __/__/____
- **Branch**:  _______________
- **Commit SHA**:  _______________
- **URL de preview**:  _______________
- **URL de producao (se ja promovida)**:  _______________
- **Responsavel**:  _______________

## 1. Build na Vercel

- [ ] Build status: `Ready`
- [ ] Logs do build sem warnings de TypeScript
- [ ] `ENFORCE_PROD_ENV=1` aplicado (se for deploy de prod, nao preview)
- [ ] Comandos executados pelo Vercel: `prisma generate && next build`

## 2. Banco de dados

- [ ] `DATABASE_URL` configurado na Vercel
- [ ] Provedor: Neon (ou outro Postgres)
- [ ] `prisma db push` executado no banco de homologacao
- [ ] Tabelas criadas: User, Account, Session, VerificationToken,
      Subscription, Payment, UsageLog

## 3. Upstash Redis

- [ ] `UPSTASH_REDIS_REST_URL` configurado
- [ ] `UPSTASH_REDIS_REST_TOKEN` configurado
- [ ] Painel do Upstash mostra chamadas apos 1 min de uso

## 4. CloudConvert

- [ ] `CLOUDCONVERT_API_KEY` configurado (sandbox ou producao)
- [ ] `CLOUDCONVERT_API_URL=https://api.cloudconvert.com/v2`
- [ ] Smoke: upload de PDF pequeno em `/ferramenta/protect` criou job
- [ ] delete-job: job removido do CC apos download

## 5. Mercado Pago (sandbox)

- [ ] `MERCADO_PAGO_ACCESS_TOKEN` de sandbox configurado
- [ ] `MERCADO_PAGO_WEBHOOK_SECRET` configurado
- [ ] `MERCADO_PAGO_SANDBOX=1` (em homologacao)
- [ ] Webhook cadastrado: `https://<preview>/api/webhooks/mercado-pago`
- [ ] Smoke: pagamento aprovado sandbox -> `User.planCode = PLUS`
- [ ] Smoke: pagamento rejeitado sandbox -> `User.planCode` continua `FREE`

## 6. Stripe (test mode)

- [ ] `STRIPE_SECRET_KEY` de test mode configurado (`sk_test_...`)
- [ ] `STRIPE_PUBLIC_KEY` de test mode configurado (`pk_test_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado
- [ ] Webhook cadastrado: `https://<preview>/api/webhooks/stripe`
- [ ] Smoke: cartao `4242 4242 4242 4242` -> `User.planCode = PREMIUM`
- [ ] Smoke: cartao `4000 0000 0000 0002` -> `User.planCode` continua `FREE`

## 7. Test runner automatizado (test:phase7)

- [ ] `HOMOLOGATION_BASE_URL=https://<preview>.vercel.app npm run test:phase7`
- [ ] Resultado: `PHASE 7 OK` (40 pass / 0 fail esperado)
- [ ] `PHASE7-HOMOLOGATION-REPORT.txt` anexado

## 8. Test runners locais (nao podem quebrar)

- [ ] `npm run build` local: OK
- [ ] `npm run test:phase4` local: 27/27 PASS
- [ ] `npm run test:phase5` local: 38/38 PASS
- [ ] `npm run test:phase6` local: 40/40 PASS

## 9. Paginas e APIs publicas (sem autenticacao)

- [ ] `GET /` retorna 200
- [ ] `GET /pricing` retorna 200
- [ ] `GET /contact-sales` retorna 200
- [ ] `GET /privacidade` retorna 200
- [ ] `GET /termos` retorna 200
- [ ] `GET /seguranca` retorna 200
- [ ] `GET /cookies` retorna 200
- [ ] `GET /suporte` retorna 200
- [ ] `GET /ferramenta/merge` retorna 200
- [ ] `GET /api/usage/anonymous` retorna 200
- [ ] `GET /api/usage/me` retorna 200 (anonimo)
- [ ] `POST /api/cloudconvert/create-job` sem auth retorna 401
- [ ] `POST /api/cloudconvert/delete-job` sem body retorna 400
- [ ] `POST /api/billing/checkout` sem auth retorna 401
- [ ] `POST /api/webhooks/mercado-pago` sem body nao retorna 500
- [ ] `POST /api/webhooks/stripe` sem body nao retorna 500

## 10. Cabecalhos de seguranca

- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- [ ] `X-Powered-By` nao aparece

## 11. Nenhum segredo exposto em HTML publico

- [ ] HTML da home nao contem `authorization: bearer`
- [ ] HTML da home nao contem `api_key` (palavra)
- [ ] HTML da home nao contem `sk_live` ou `sk_test`
- [ ] HTML da home nao contem `app_usr` (prefixo MP)

## 12. Politica de arquivos / retencao

- [ ] Mensagem "Processou, baixou, descartou. Nao armazenamos seus arquivos permanentemente."
      visivel na home e em cada ferramenta
- [ ] Privacy banner em `ApiToolWorkspace` (ferramentas em nuvem)
- [ ] Privacy banner em `ToolPageLayout` (ferramentas locais)
- [ ] Link "Saiba mais" aponta para `/privacidade`

## 13. Repositorio e artefatos

- [ ] `.env` e `.env.local` NAO commitados (verificar `git status`)
- [ ] `dev.db` NAO commitado
- [ ] `node_modules/` NAO commitado
- [ ] `.next/` NAO commitado
- [ ] ZIP da fase 7 gerado: `pdf-master-pro-fase-7-homologacao-vercel.zip`
- [ ] ZIP exclui `node_modules`, `.next`, `.env*`, `*.db`, `*.log`,
      scripts `.ps1` auxiliares

## 14. Veredito da homologacao

- [ ] **HOMOLOGACAO APROVADA** — todos os itens acima marcados
- [ ] **HOMOLOGACAO REPROVADA** — ha itens em aberto

## 15. Observacoes / pendencias

```
(anote aqui qualquer coisa que ficou pendente, bugs encontrados, ou
decisoes a tomar antes de promover para producao)
```

## 16. Proximos passos

- [ ] Se homologacao aprovada: promover para producao (merge na `main` ou
      "Promote to Production" no painel da Vercel)
- [ ] Rodar `test:phase7` contra production
- [ ] Configurar dominio principal (CNAME ou A na Vercel)
- [ ] Atualizar webhooks do MP e Stripe para a URL final
- [ ] Atualizar `APP_URL` e `NEXTAUTH_URL` para o dominio final
- [ ] Trocar tokens de sandbox para producao (`MERCADO_PAGO_SANDBOX=0`,
      `STRIPE_SECRET_KEY=sk_live_...`)
