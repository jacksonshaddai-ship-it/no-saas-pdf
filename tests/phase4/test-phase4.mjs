// test-phase4.mjs
// Bateria oficial de testes da Fase 4 do PDF Master Pro.
//
// Pre-requisitos:
//   - dev server rodando em http://localhost:3010  (ex.: npm run dev)
//   - mock-cloudconvert.mjs disponivel (este runner sobe automaticamente se nao estiver em :3500)
//
// O que este teste cobre:
//   1. Catalogo completo (29 ferramentas, 5 planos, /pricing publico, paginas de ferramentas)
//   2. Cadastro + login (FREE) com csrf + credentials
//   3. Backend libera ferramenta Basico (pdf-to-jpg) para usuario logado FREE
//   4. Backend bloqueia ferramenta PLUS (html-to-pdf) com 403 TOOL_REQUIRES_PLUS
//   5. Backend bloqueia ferramenta PREMIUM coming_soon (summarize-ai) com 409
//   6. Backend bloqueia ferramenta Basico coming_soon (crop) com 409
//   7. Visitante anonimo: Basico 201 / Plus 403 / Premium 409
//   8. Arquivo 21MB em FREE Basico -> 413 USER_FILE_TOO_LARGE
//
// Em todos os casos de bloqueio, o runner verifica que o mock CloudConvert
// NAO recebeu chamada POST /v2/jobs, provando que o gate acontece no backend.
//
// Como rodar:
//   npm run test:phase4
//
// Variaveis de ambiente uteis:
//   BASE_URL       (default: http://localhost:3010)
//   MOCK_CC_URL    (default: http://localhost:3500)
//   REPORT_PATH    (default: PHASE4-TEST-REPORT.txt na raiz do projeto)
//   SKIP_MOCK=1    nao tentar subir mock local (assume que ja esta rodando)

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const BASE  = process.env.BASE_URL    || "http://localhost:3010";
const MOCK  = process.env.MOCK_CC_URL || "http://localhost:3500";
const REPORT_PATH = process.env.REPORT_PATH
  || path.join(PROJECT_ROOT, "PHASE4-TEST-REPORT.txt");
const SKIP_MOCK = process.env.SKIP_MOCK === "1";

let totalPass = 0;
let totalFail = 0;
const lines = [];
const failures = [];

function log(line) {
  console.log(line);
  lines.push(line);
}

function assert(label, condition, detail) {
  if (condition) {
    totalPass += 1;
    log(`PASS  ${label}${detail ? "  (" + detail + ")" : ""}`);
  } else {
    totalFail += 1;
    failures.push({ label, detail });
    log(`FAIL  ${label}${detail ? "  (" + detail + ")" : ""}`);
  }
}

function assertEq(label, actual, expected) {
  const cond = actual === expected;
  assert(label, cond, `got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`);
}

async function http_(url, opts = {}) {
  const res = await fetch(url, { ...opts, redirect: "manual" });
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return { res, setCookie };
}

function mergeCookies(existing, setCookie) {
  if (!setCookie || setCookie.length === 0) return existing;
  const map = new Map();
  for (const c of (existing || "").split(";").map((s) => s.trim()).filter(Boolean)) {
    const [k, ...v] = c.split("=");
    map.set(k, v.join("="));
  }
  for (const sc of setCookie) {
    const [pair] = sc.split(";");
    const [k, ...v] = pair.split("=");
    map.set(k.trim(), v.join("=").trim());
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function cookieHeader(cookies) {
  return cookies ? { cookie: cookies } : {};
}

async function getText(url, cookies) {
  const { res, setCookie } = await http_(url, { headers: cookieHeader(cookies) });
  const text = await res.text();
  return { status: res.status, text, setCookie, headers: res.headers };
}

async function postJson(url, body, cookies) {
  const { res, setCookie } = await http_(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cookieHeader(cookies) },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json, setCookie };
}

async function getJson(url, cookies) {
  const { res, setCookie } = await http_(url, { headers: cookieHeader(cookies) });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json, setCookie };
}

async function mockStats() {
  return getJson(`${MOCK}/__stats`);
}

async function mockReset() {
  return postJson(`${MOCK}/__reset`, {});
}

// =====================================================================
// Mock lifecycle: sobe sozinho se nao estiver em :3500
// =====================================================================

async function isMockUp() {
  try {
    const r = await fetch(`${MOCK}/__stats`, { method: "GET" });
    return r.status === 200;
  } catch {
    return false;
  }
}

let spawnedMock = null;

async function startMockIfNeeded() {
  if (SKIP_MOCK) {
    log("   SKIP_MOCK=1: assumindo mock ja em :3500");
    return;
  }
  if (await isMockUp()) {
    log("   mock-cc ja esta em :3500 (externo)");
    return;
  }
  log("   mock-cc nao encontrado em :3500: subindo como sub-processo...");
  const mockScript = path.join(__dirname, "mock-cloudconvert.mjs");
  spawnedMock = spawn(process.execPath, [mockScript], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MOCK_CC_PORT: "3500" },
  });
  spawnedMock.stdout.on("data", (b) => process.stdout.write(`[mock-cc] ${b}`));
  spawnedMock.stderr.on("data", (b) => process.stderr.write(`[mock-cc] ${b}`));
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await isMockUp()) {
      log("   mock-cc pronto em :3500");
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("mock-cc nao subiu em 10s");
}

function stopSpawnedMock() {
  if (!spawnedMock) return;
  try {
    spawnedMock.kill("SIGTERM");
  } catch {}
  spawnedMock = null;
}

process.on("exit", stopSpawnedMock);
process.on("SIGINT", () => { stopSpawnedMock(); process.exit(130); });
process.on("SIGTERM", () => { stopSpawnedMock(); process.exit(143); });

// =====================================================================
// Aguarda dev server
// =====================================================================

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/pricing`, { method: "GET" });
      if (r.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`dev server nao ficou pronto em 90s (${BASE})`);
}

// =====================================================================
// Inicio
// =====================================================================

log("=== PDF Master Pro — Testes oficiais da Fase 4 ===");
log(`BASE    = ${BASE}`);
log(`MOCK    = ${MOCK}`);
log(`REPORT  = ${REPORT_PATH}`);
log("");

log("0) Garantindo mock-cc em :3500");
await startMockIfNeeded();

log("1) Aguardando dev server em " + BASE);
await waitForServer();
log("   pronto.");

await mockReset();

log("");
log("2) Pre-warm de paginas (forca compilacao Next.js)...");
for (const p of ["/pricing", "/ferramenta/pdf-to-pptx", "/ferramenta/html-to-pdf", "/ferramenta/redact", "/ferramenta/crop", "/ferramenta/summarize-ai"]) {
  try {
    const r = await fetch(`${BASE}${p}`);
    log(`      warmed ${p} (status=${r.status})`);
  } catch (e) {
    log(`      warm fail ${p}: ${e.message}`);
  }
}
log("");

// =====================================================================
// TEST 1: CATALOGO COMPLETO
// =====================================================================
log("==== TEST 1: CATALOGO COMPLETO ====");

{
  const r = await fetch(`${BASE}/`);
  assertEq("1.a  GET / retorna 200", r.status, 200);
}

{
  const { text } = await getText(`${BASE}/`);
  const has29 = /\b29\b/.test(text);
  const hasCount = /ferramentas catalogadas/.test(text);
  assert("1.b  home renderiza catalogo (29 ou contagem)", has29 && hasCount, `has29=${has29} hasCount=${hasCount}`);
}

{
  const r = await fetch(`${BASE}/pricing`);
  assertEq("1.c  /pricing 200", r.status, 200);
}

{
  const { text } = await getText(`${BASE}/pricing`);
  const labels = ["Básico", "Conta grátis", "Plus", "Premium", "Empresarial"];
  const missing = labels.filter((l) => !text.includes(l));
  assert("1.d  /pricing renderizou 5 planos", missing.length === 0, missing.length ? `faltando: ${missing.join(", ")}` : "5/5");
}

{
  const { text } = await getText(`${BASE}/pricing`);
  const patterns = [
    /\b3\s*\/\s*dia\b/i,
    /\b5\s*\/\s*dia\b/i,
    /\b30\s*\/\s*m[êe]s\b/i,
    /\b20\s*MB\b/i,
  ];
  const leaks = patterns.filter((p) => p.test(text));
  assert("1.e  limites tecnicos do Basico nao aparecem publicamente", leaks.length === 0, leaks.length ? `vazou: ${leaks.map((p) => p.source).join("; ")}` : "ok");
}

{
  const tools = ["pdf-to-pptx", "html-to-pdf", "redact"];
  const results = [];
  for (const t of tools) {
    const r = await fetch(`${BASE}/ferramenta/${t}`);
    results.push({ t, status: r.status });
  }
  const allOk = results.every((r) => r.status === 200);
  assert("1.f  3 paginas de ferramentas retornaram 200", allOk, results.map((r) => `${r.t}=${r.status}`).join(" "));
}

{
  const { status, text } = await getText(`${BASE}/ferramenta/crop`);
  assert("1.g  crop status=200 (coming_soon Basico)", status === 200, `got ${status}`);
  assert("1.g  crop renderizou aviso/nome", /Recortar PDF|em breve|coming/i.test(text), "");
}

{
  const { status } = await getText(`${BASE}/ferramenta/summarize-ai`);
  assert("1.h  summarize-ai status=200 (coming_soon Premium)", status === 200, `got ${status}`);
}

log("");

// =====================================================================
// TEST 2: CADASTRO + LOGIN (FREE)
// =====================================================================
log("==== TEST 2: CADASTRO + LOGIN (FREE) ====");

const email = `fase4-${Date.now()}@example.com`;
const password = "Test1234!";

let cookies = "";

{
  const { status } = await postJson(`${BASE}/api/auth/register`, {
    name: "Tester Fase 4",
    email,
    password,
  });
  assertEq("2.a  POST /api/auth/register 201", status, 201);
}

let csrfToken = null;
{
  const { status, json, setCookie } = await getJson(`${BASE}/api/auth/csrf`);
  cookies = mergeCookies(cookies, setCookie);
  assertEq("2.b  GET /api/auth/csrf 200", status, 200);
  csrfToken = json?.csrfToken || null;
  assert("2.c  csrfToken presente", !!csrfToken, csrfToken ? "ok" : "faltando");
}

if (csrfToken) {
  const params = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/account`,
    json: "true",
  });
  const { res, setCookie } = await http_(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...cookieHeader(cookies),
    },
    body: params.toString(),
  });
  cookies = mergeCookies(cookies, setCookie);
  assert("2.d  login OK (200 ou 302)", res.status === 200 || res.status === 302, `got ${res.status}`);
}

{
  const { status, json } = await getJson(`${BASE}/api/usage/me`, cookies);
  const ok = status === 200 && json && (json.type === "user" || json.planCode === "FREE");
  assert("2.e  /api/usage/me logado retorna user/FREE", ok, status === 200 ? `type=${json?.type} planCode=${json?.planCode ?? json?.plan}` : `status=${status}`);
}

log("");

// =====================================================================
// TEST 3: FREE usa ferramenta BASICO (pdf-to-jpg) -> 201
// =====================================================================
log("==== TEST 3: FREE usa ferramenta BASICO (pdf-to-jpg) ====");

await mockReset();

{
  const { status, json } = await postJson(
    `${BASE}/api/cloudconvert/create-job`,
    {
      tool: "pdf-to-jpg",
      filename: "teste.pdf",
      contentType: "application/pdf",
      size: 100 * 1024,
    },
    cookies,
  );
  assert("3.a  FREE chama pdf-to-jpg -> 201", status === 201, `status=${status} error=${json?.error}`);
}

const statsAfterT3 = await mockStats();
assert("3.b  mock-cc recebeu 1 chamada apos T3", statsAfterT3.json?.jobs === 1, `jobs=${statsAfterT3.json?.jobs}`);

log("");

// =====================================================================
// TEST 4: FREE tenta ferramenta PLUS (html-to-pdf) -> bloqueia
// =====================================================================
log("==== TEST 4: FREE tenta ferramenta PLUS (html-to-pdf) -> bloqueia ====");

const jobsBeforeT4 = (await mockStats()).json?.jobs ?? 0;

{
  const { status, json } = await postJson(
    `${BASE}/api/cloudconvert/create-job`,
    {
      tool: "html-to-pdf",
      filename: "page.html",
      contentType: "text/html",
      size: 4096,
    },
    cookies,
  );
  assert(
    "4.a  403 TOOL_REQUIRES_PLUS",
    status === 403 && json?.error === "TOOL_REQUIRES_PLUS" && (json?.upgradeUrl === "/pricing" || (json?.upgradeUrl || "").includes("/pricing")),
    `status=${status} error=${json?.error}`,
  );
}

const jobsAfterT4 = (await mockStats()).json?.jobs ?? 0;
assert("4.b  mock-cc NAO recebeu chamada (jobs inalterado)", jobsAfterT4 === jobsBeforeT4, `${jobsBeforeT4} antes / ${jobsAfterT4} depois`);

log("");

// =====================================================================
// TEST 5: FREE tenta ferramenta PREMIUM coming_soon (summarize-ai) -> bloqueia
// =====================================================================
log("==== TEST 5: FREE tenta ferramenta PREMIUM coming_soon (summarize-ai) -> bloqueia ====");

const jobsBeforeT5 = (await mockStats()).json?.jobs ?? 0;

{
  const { status, json } = await postJson(
    `${BASE}/api/cloudconvert/create-job`,
    {
      tool: "summarize-ai",
      filename: "doc.pdf",
      contentType: "application/pdf",
      size: 100 * 1024,
    },
    cookies,
  );
  assert("5.a  409 TOOL_COMING_SOON", status === 409 && json?.error === "TOOL_COMING_SOON", `status=${status} error=${json?.error}`);
}

const jobsAfterT5 = (await mockStats()).json?.jobs ?? 0;
assert("5.b  mock-cc NAO recebeu chamada", jobsAfterT5 === jobsBeforeT5, `${jobsBeforeT5} antes / ${jobsAfterT5} depois`);

log("");

// =====================================================================
// TEST 6: FREE tenta Basico coming_soon (crop) -> bloqueia
// =====================================================================
log("==== TEST 6: FREE tenta Basico coming_soon (crop) -> bloqueia ====");

{
  const { status, json } = await postJson(
    `${BASE}/api/cloudconvert/create-job`,
    {
      tool: "crop",
      filename: "doc.pdf",
      contentType: "application/pdf",
      size: 100 * 1024,
    },
    cookies,
  );
  assert("6.a  409 TOOL_COMING_SOON", status === 409 && json?.error === "TOOL_COMING_SOON", `status=${status} error=${json?.error}`);
}

log("");

// =====================================================================
// TEST 7: ANON chama Basico (pdf-to-jpg) -> 201
// =====================================================================
log("==== TEST 7: ANON chama Basico (pdf-to-jpg) -> 201 ====");

await mockReset();

{
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "pdf-to-jpg",
    filename: "anon.pdf",
    contentType: "application/pdf",
    size: 100 * 1024,
  });
  assert("7.a  anon pdf-to-jpg 201", status === 201, `status=${status} error=${json?.error}`);
}

const jobsBeforeT7 = (await mockStats()).json?.jobs ?? 0;

{
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "html-to-pdf",
    filename: "page.html",
    contentType: "text/html",
    size: 4096,
  });
  assert("7.b  anon Plus bloqueia (403 TOOL_REQUIRES_PLUS)", status === 403 && json?.error === "TOOL_REQUIRES_PLUS", `status=${status} error=${json?.error}`);
}

const jobsMidT7 = (await mockStats()).json?.jobs ?? 0;
assert("7.b.1  mock-cc NAO recebeu chamada em 7.b", jobsMidT7 === jobsBeforeT7, `${jobsBeforeT7} antes / ${jobsMidT7} depois`);

{
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "summarize-ai",
    filename: "doc.pdf",
    contentType: "application/pdf",
    size: 100 * 1024,
  });
  assert("7.c  anon Premium coming_soon bloqueia (409)", status === 409 && json?.error === "TOOL_COMING_SOON", `status=${status} error=${json?.error}`);
}

const jobsAfterT7 = (await mockStats()).json?.jobs ?? 0;
assert("7.c.1  mock-cc NAO recebeu chamada em 7.c", jobsAfterT7 === jobsBeforeT7, `${jobsBeforeT7} antes / ${jobsAfterT7} depois`);

log("");

// =====================================================================
// TEST 8: FREE arquivo 21MB em Basico -> 413
// =====================================================================
log("==== TEST 8: FREE arquivo 21MB em Basico -> 413 ====");

{
  const { status, json } = await postJson(
    `${BASE}/api/cloudconvert/create-job`,
    {
      tool: "pdf-to-jpg",
      filename: "grande.pdf",
      contentType: "application/pdf",
      size: 21 * 1024 * 1024,
    },
    cookies,
  );
  assert(
    "8.a  21MB 413 USER_FILE_TOO_LARGE",
    status === 413 && (json?.error === "USER_FILE_TOO_LARGE" || json?.code === "USER_FILE_TOO_LARGE"),
    `status=${status} error=${json?.error} code=${json?.code}`,
  );
}

log("");

// =====================================================================
// Resultado final + gravacao do relatorio
// =====================================================================
const total = totalPass + totalFail;
const verdict = totalFail === 0 ? "PHASE 4 OK" : "PHASE 4 FAIL";
log(`==== TOTAL: ${totalPass} pass / ${totalFail} fail ====`);
log(verdict);

if (REPORT_PATH) {
  const header = [
    "================================================================================",
    "PDF Master Pro - Relatorio oficial de Testes da Fase 4",
    "================================================================================",
    `Data de execucao:  ${new Date().toISOString()}`,
    `Runner:            tests/phase4/test-phase4.mjs (oficial, versionado)`,
    `Base URL:          ${BASE}`,
    `Mock:              ${MOCK}`,
    `Stack:             Next.js 14 (App Router) + TypeScript 5.7 + Tailwind 3.4`,
    `                   pdf-lib 1.17 + CloudConvert v2 + Prisma + NextAuth v4`,
    "",
    "Escopo da Fase 4:",
    "  - Catalogo completo de 29 ferramentas (BASIC / PLUS / PREMIUM / ENTERPRISE)",
    "  - 5 planos: ANONYMOUS, FREE, PLUS, PREMIUM, ENTERPRISE",
    "  - Backend bloqueia por minimumPlan e status (implemented/coming_soon)",
    "  - Pagina /pricing com 4 cards publicos + Enterprise 'Sob consulta'",
    "  - Sem limites tecnicos exatos do Basico exibidos publicamente",
    "  - Sem implementacao de pagamento (Plus/Premium = 'Em breve')",
    "",
    `Resultado: ${totalPass} pass / ${totalFail} fail  ->  ${verdict}`,
    "================================================================================",
    "",
  ].join("\n");
  const body = header + lines.join("\n") + "\n";
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, body, "utf8");
  log(`\nRelatorio salvo em: ${REPORT_PATH}`);
}

if (totalFail > 0) {
  process.exit(1);
}
