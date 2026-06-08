# Testes oficiais da Fase 4 — Catálogo e Planos

Esta pasta contém o **runner oficial** de testes da Fase 4 do PDF Master Pro.
Substitui o teste ad-hoc usado em 2026-06-07 (que produziu o relatório antigo
`PHASE4-TEST-REPORT.txt` com **23/23**) e adiciona verificações extras.

## Arquivos

| Arquivo | Papel |
|---|---|
| `test-phase4.mjs`     | Runner principal. Sobe o mock, executa 27 asserções e grava o relatório. |
| `mock-cloudconvert.mjs` | Mock do CloudConvert v2 em `http://localhost:3500`. Sub-processo do runner ou comando manual. |
| `README.md`           | Este arquivo. |

## Por que 27 e não 23?

O relatório antigo (`PHASE4-TEST-REPORT.txt` gerado em 2026-06-07 01:42)
documentou **23 asserções** de um script que **não foi versionado** — vivia só
em sessão de terminal e se perdeu quando a sessão fechou. Este runner é a
**reescrita oficial** desse mesmo cenário, com:

- Mesmas asserções do relatório antigo (catálogo, 5 planos em `/pricing`,
  3 planos, registro/login, FREE em Básico, bloqueio de Plus/Premium/Básico
  coming_soon, anônimo, limite de 21 MB);
- **+4 asserções extras** para garantir que o mock CloudConvert **não**
  recebeu chamada `POST /v2/jobs` em todos os casos de bloqueio do usuário
  anônimo (paralelo aos testes 4.b e 5.b para usuário logado).

Total: **27 asserções**.

## O que o runner valida

1. **Catálogo completo**
   - `GET /` retorna 200 e mostra a contagem de 29 ferramentas
   - `/pricing` renderiza 200 e mostra os 5 planos (Básico, Conta grátis,
     Plus, Premium, Empresarial)
   - `/pricing` **não** vaza limites técnicos exatos do plano grátis
     (3/dia, 5/dia, 30/mês, 20 MB)
   - Páginas de ferramentas implementadas (pdf-to-pptx, html-to-pdf, redact)
     respondem 200
   - Páginas de ferramentas *coming soon* (crop Básica, summarize-ai
     Premium) também respondem 200
2. **Cadastro e login grátis**
   - `POST /api/auth/register` → 201
   - `GET /api/auth/csrf` → 200 com `csrfToken`
   - `POST /api/auth/callback/credentials` → 200/302
   - `GET /api/usage/me` autenticado → `type=user, planCode=FREE`
3. **Bloqueio por plano (backend)**
   - FREE chama `pdf-to-jpg` (Básico) → **201**, mock recebe 1 job
   - FREE chama `html-to-pdf` (Plus) → **403 TOOL_REQUIRES_PLUS**, mock
     **não** recebe chamada
   - FREE chama `summarize-ai` (Premium coming_soon) → **409
     TOOL_COMING_SOON**, mock **não** recebe chamada
   - FREE chama `crop` (Básico coming_soon) → **409 TOOL_COMING_SOON**
4. **Visitante anônimo**
   - Anônimo chama `pdf-to-jpg` → **201**
   - Anônimo chama `html-to-pdf` (Plus) → **403 TOOL_REQUIRES_PLUS**,
     mock **não** recebe chamada
   - Anônimo chama `summarize-ai` (Premium coming_soon) → **409
     TOOL_COMING_SOON**, mock **não** recebe chamada
5. **Limite de tamanho**
   - FREE com 21 MB em `pdf-to-jpg` → **413 USER_FILE_TOO_LARGE**

A regra geral: **em todo bloqueio por plano ou coming_soon o mock
CloudConvert fica intocado** (contador `jobs` inalterado). Isso prova que o
gate acontece **antes** de chamar o provedor externo.

## Como rodar

```bash
# 1) Suba o dev server (em outro terminal)
npm run dev
# espere a mensagem "Ready" aparecer

# 2) Rode o teste (sobe o mock-cc sozinho se :3500 estiver livre)
npm run test:phase4

# 2 alt) Suba o mock manualmente em outro terminal e rode o teste
npm run mock:cloudconvert     # em um terminal
SKIP_MOCK=1 npm run test:phase4  # em outro
```

O relatório é gravado em `PHASE4-TEST-REPORT.txt` (na raiz do projeto).

### Variáveis de ambiente

| Var          | Default                          | Uso |
|--------------|----------------------------------|-----|
| `BASE_URL`   | `http://localhost:3010`          | URL do Next dev |
| `MOCK_CC_URL`| `http://localhost:3500`          | URL do mock |
| `REPORT_PATH`| `<projeto>/PHASE4-TEST-REPORT.txt` | Onde gravar o relatório |
| `SKIP_MOCK`  | `0`                              | `1` = não tentar subir mock local |

## Critério de aceite

- Build: `npm run build` passa sem erro.
- Teste: `npm run test:phase4` termina com `PHASE 4 OK` (27/27).
- Relatório: `PHASE4-TEST-REPORT.txt` atualizado na raiz do projeto.
- Verificação crítica: a coluna "mock-cc NAO recebeu chamada" aparece
  em todos os testes 4, 5 e 7 (Plus, Premium coming_soon, anônimo
  Plus/Premium coming_soon).
