# Phase 7 — Test Runner (Homologacao Vercel)

Bateria oficial de homologacao da Fase 7. Diferente dos runners das fases
anteriores, este **nao sobe mocks locais**: ele testa contra a URL publica
do deploy na Vercel (preview ou production).

## Pre-requisitos

1. Deploy na Vercel concluido (build passou).
2. URL publica conhecida (ex.: `https://pdf-master-pro.vercel.app` ou
   `https://pdf-master-pro-git-homologacao.vercel.app`).
3. Variavel de ambiente `HOMOLOGATION_BASE_URL` apontando para a URL
   (sem barra no final).

## Como rodar

```bash
HOMOLOGATION_BASE_URL=https://sua-url.vercel.app npm run test:phase7
```

Variaveis uteis:

- `HOMOLOGATION_BASE_URL` (obrigatoria) — URL publica do deploy.
- `BASE_URL` — alias (usado se `HOMOLOGATION_BASE_URL` nao estiver setada).
- `REPORT_PATH` — default `PHASE7-HOMOLOGATION-REPORT.txt` na raiz.
- `SKIP_NETWORK=1` — modo sanidade (nao faz chamadas; util para CI sem rede).

## O que eh testado

1. Home (`/`) retorna 200.
2. `/pricing` retorna 200.
3. `/contact-sales` retorna 200.
4. Paginas legais (`/privacidade`, `/termos`, `/seguranca`, `/cookies`,
   `/suporte`) retornam 200.
5. Footer da home contem links para as paginas legais.
6. `/ferramenta/merge` (local) renderiza.
7. Cabecalhos de seguranca em respostas reais:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` restrito.
8. `X-Powered-By` nao aparece.
9. `/api/usage/me` sem auth retorna 200 (anonimo).
10. `/api/billing/status` sem auth nao retorna 500.
11. `/api/usage/anonymous` retorna 200.
12. `/api/cloudconvert/create-job` sem auth retorna 401.
13. `/api/cloudconvert/delete-job` sem body retorna 400.
14. `/api/billing/checkout` sem auth retorna 401.
15. `/api/webhooks/mercado-pago` sem body nao retorna 500.
16. `/api/webhooks/stripe` sem body nao retorna 500.
17. `/ferramenta/crop` (coming_soon Basico) renderiza aviso.
18. Nenhum segredo em HTML publico:
    - `authorization: bearer`
    - `api_key` (palavra)
    - `sk_live` ou `sk_test`
    - `app_usr` (prefixo de access token do MP).

## O que este runner **nao** faz

- Nao testa fluxo de pagamento end-to-end (isso depende de MP e Stripe
  reais, que tem suas proprias ferramentas de teste e webhooks reais).
- Nao testa webhook HMAC (precisa das chaves secretas reais, que nao
  devem estar no repositorio nem no runner).
- Nao valida o CloudConvert real (a Vercel ja chama o CC nos fluxos
  existentes; se quiser validar manualmente, abra uma ferramenta em
  nuvem na URL de homologacao e faca upload de um PDF pequeno).
- Nao cria usuario, nao ativa plano, nao simula webhook (esses fluxos
  ja sao cobertos pelo `test:phase5` localmente; o homolog so verifica
  o que esta exposto publicamente sem precisar de credenciais).

## Exemplo de uso

```bash
# Preview deploy
HOMOLOGATION_BASE_URL=https://pdf-master-pro-git-fase-7.vercel.app npm run test:phase7

# Production (somente apos preview validado)
HOMOLOGATION_BASE_URL=https://pdf-master-pro.vercel.app npm run test:phase7
```

## Saida

O runner gera `PHASE7-HOMOLOGATION-REPORT.txt` na raiz do projeto com:

- Data de execucao
- URL de homologacao testada
- Escopo da Fase 7
- Resultado final: `PHASE 7 OK` (todos passaram) ou `PHASE 7 FAIL`.
