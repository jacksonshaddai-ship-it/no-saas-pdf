# Phase 6 — Test Runner (Seguranca)

Bateria oficial de testes da Fase 6 do PDF Master Pro.

## Pre-requisitos

1. `npm install` ja executado.
2. `.env.local` com `BILLING_SKIP_WEBHOOK_SIG=1` (ja vem do `.env.example`).
3. Dev server rodando em outra aba:
   ```bash
   npm run dev -- -p 3010
   ```
4. O runner sobe o mock do CloudConvert (porta 3500) se nao estiver rodando.

## Como rodar

```bash
npm run test:phase6
```

Variaveis uteis:

- `BASE_URL=http://localhost:3010` (default)
- `CC_MOCK_URL=http://localhost:3500` (default)
- `SKIP_MOCK=1` para nao subir mocks locais
- `REPORT_PATH=PHASE6-TEST-REPORT.txt` (default na raiz do projeto)

## O que eh testado

1. Paginas legais (`/privacidade`, `/termos`, `/seguranca`, `/cookies`, `/suporte`) retornam 200 sem autenticacao.
2. Paginas legais mencionam a mensagem publica de retencao ("nao armazenamos" / "/privacidade" / "processou, baixou, descartou").
3. Footer da home tem links para as paginas legais.
4. Footer de uma ferramenta (`/ferramenta/merge`) tem links para as paginas legais.
5. Cabecalhos de seguranca presentes em todas as paginas:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
   - `X-Powered-By` removido.
6. `/api/cloudconvert/delete-job` valida `jobId` malformado (string vazia, path traversal, espacos, command injection).
7. `/api/cloudconvert/delete-job` chama o mock do CloudConvert e remove o job (status 204, ID aparece em `/__deletes`).
8. Response do `delete-job` nao expoe `Authorization` nem `CLOUDCONVERT_API_KEY`.
9. `delete-job` aplica rate limit (algum dos 25 requests anonimos retorna 429).
10. Smoke check: `/pricing`, `/account`, `/ferramenta/merge`, `/contact-sales` retornam 200/302.

## Saida

O runner gera `PHASE6-TEST-REPORT.txt` na raiz do projeto com:

- Data de execucao
- URLs e stack
- Escopo da Fase 6
- Resultado final: `PHASE 6 OK` (todos passaram) ou `PHASE 6 FAIL`.

## Exemplo de saida

```
==== TEST 1: paginas legais retornam 200 ====
PASS  1  /privacidade -> 200  (status=200)
PASS  1  /termos -> 200  (status=200)
...
==== TOTAL: 42 pass / 0 fail ====
PHASE 6 OK
```
