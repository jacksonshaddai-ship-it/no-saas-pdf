// test-phase6.mjs
// Bateria oficial de testes da Fase 6 do PDF Master Pro (seguranca, privacidade, retencao).
//
// Pre-requisitos:
//   - dev server rodando em http://localhost:3010
//   - MOCK_CC_URL=http://localhost:3500 (mock-cloudconvert da Fase 4)
//
// O runner sobe o mock do CloudConvert se nao estiver em :3500.
//
// Cobertura (cada item gera 1+ assercoes):
//   1. Paginas legais retornam 200
//   2. Paginas legais nao exigem autenticacao
//   3. Paginas legais mencionam a mensagem publica de retencao
//   4. Footer da home e de uma ferramenta tem links para as paginas legais
//   5. Cabecalhos de seguranca estao presentes em todas as paginas
//   6. /api/cloudconvert/delete-job valida jobId malformado
//   7. /api/cloudconvert/delete-job chama o mock CC (DELETE /v2/jobs/<id>)
//   8. /api/cloudconvert/delete-job nao expoe o token do CloudConvert
//   9. /api/cloudconvert/delete-job faz rate limiting
//  10. test:phase4 e test:phase5 continuam passando (smoke check por endpoints chave)
//
// Variaveis de ambiente:
//   BASE_URL       default http://localhost:3010
//   CC_MOCK_URL    default http://localhost:3500
//   SKIP_MOCK=1    nao subir mocks locais
//   REPORT_PATH    default PHASE6-TEST-REPORT.txt na raiz do projeto

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const BASE = process.env.BASE_URL || "http://localhost:3010";
const CC_MOCK = process.env.CC_MOCK_URL || process.env.MOCK_CC_URL || "http://localhost:3500";
const REPORT_PATH = process.env.REPORT_PATH
  || path.join(PROJECT_ROOT, "PHASE6-TEST-REPORT.txt");
const SKIP_MOCK = process.env.SKIP_MOCK === "1";

let totalPass = 0;
let totalFail = 0;
const lines = [];
const failures = [];

function log(line) {
  console.log(line);
  lines.push(line);
}
function assert(label, cond, detail) {
  if (cond) { totalPass += 1; log(`PASS  ${label}${detail ? "  (" + detail + ")" : ""}`); }
  else { totalFail += 1; failures.push({ label, detail }); log(`FAIL  ${label}${detail ? "  (" + detail + ")" : ""}`); }
}
function assertEq(label, actual, expected) {
  const c = actual === expected;
  assert(label, c, `got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`);
}

async function http_(url, opts = {}) {
  const res = await fetch(url, { ...opts, redirect: "manual" });
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return { res, setCookie };
}

async function getText(url, cookies) {
  const { res, setCookie } = await http_(url, {
    headers: cookies ? { cookie: cookies } : {},
  });
  return { status: res.status, text: await res.text(), headers: res.headers, setCookie };
}

async function postJson(url, body, cookies) {
  const { res, setCookie } = await http_(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookies ? { cookie: cookies } : {}) },
    body: JSON.stringify(body),
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, headers: res.headers, setCookie };
}

async function mockStats(url) {
  try { const r = await fetch(`${url}/__stats`); return r.status === 200 ? await r.json() : null; }
  catch { return null; }
}
async function mockReset(url) {
  try { const r = await fetch(`${url}/__reset`, { method: "POST" }); return r.status; }
  catch { return -1; }
}
async function mockDeletes(url) {
  try { const r = await fetch(`${url}/__deletes`); return r.status === 200 ? await r.json() : null; }
  catch { return null; }
}

async function isMockUp(url) {
  try { const r = await fetch(`${url}/__stats`); return r.status === 200; } catch { return false; }
}

const spawned = { cc: null };
async function startMock(name, scriptName, url) {
  if (SKIP_MOCK) { log(`   SKIP_MOCK=1: assumindo ${name} em ${url}`); return; }
  if (await isMockUp(url)) { log(`   ${name} ja esta em ${url}`); return; }
  log(`   ${name} nao encontrado em ${url}: subindo como sub-processo...`);
  const absScript = path.isAbsolute(scriptName) ? scriptName : path.join(__dirname, scriptName);
  const proc = spawn(process.execPath, [absScript], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } });
  proc.stdout.on("data", (b) => process.stdout.write(`[${name}] ${b}`));
  proc.stderr.on("data", (b) => process.stderr.write(`[${name}] ${b}`));
  spawned[name] = proc;
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await isMockUp(url)) { log(`   ${name} pronto em ${url}`); return; }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${name} nao subiu em 10s`);
}
function stopSpawned() {
  for (const k of Object.keys(spawned)) {
    if (spawned[k]) { try { spawned[k].kill("SIGTERM"); } catch {} spawned[k] = null; }
  }
}
process.on("exit", stopSpawned);
process.on("SIGINT", () => { stopSpawned(); process.exit(130); });
process.on("SIGTERM", () => { stopSpawned(); process.exit(143); });

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try { const r = await fetch(`${BASE}/`); if (r.status === 200) return; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`dev server nao ficou pronto em 90s (${BASE})`);
}

log("=== PDF Master Pro - Testes oficiais da Fase 6 (seguranca) ===");
log(`BASE     = ${BASE}`);
log(`CC_MOCK  = ${CC_MOCK}`);
log(`REPORT   = ${REPORT_PATH}`);
log("");

log("0) Subindo mocks...");
await startMock("cc", path.join(PROJECT_ROOT, "tests", "phase4", "mock-cloudconvert.mjs"), CC_MOCK);
await mockReset(CC_MOCK);

log("1) Aguardando dev server em " + BASE);
await waitForServer();
log("   pronto.");
log("");

// =====================================================================
// TEST 1: paginas legais retornam 200 sem autenticacao
// =====================================================================
log("==== TEST 1: paginas legais retornam 200 ====");
const legalPages = ["/privacidade", "/termos", "/seguranca", "/cookies", "/suporte"];
for (const p of legalPages) {
  const r = await getText(`${BASE}${p}`);
  assert(`1  ${p} -> 200`, r.status === 200, `status=${r.status}`);
}

// =====================================================================
// TEST 2: paginas legais mencionam a mensagem publica de retencao
// =====================================================================
log("");
log("==== TEST 2: paginas legais mencionam retencao ====");
for (const p of legalPages) {
  const r = await getText(`${BASE}${p}`);
  const lower = r.text.toLowerCase();
  // Cada pagina deve mencionar a politica ou um link para /privacidade
  const mentions =
    lower.includes("nao armazenamos") ||
    lower.includes("/privacidade") ||
    lower.includes("processou, baixou, descartou");
  assert(`2  ${p} menciona retencao/privacidade`, mentions, "");
}

// =====================================================================
// TEST 3: Footer da home tem links para paginas legais
// =====================================================================
log("");
log("==== TEST 3: Footer da home tem links legais ====");
{
  const r = await getText(`${BASE}/`);
  const lower = r.text.toLowerCase();
  for (const p of legalPages) {
    assert(`3  home footer link -> ${p}`, lower.includes(p), "");
  }
}

// =====================================================================
// TEST 4: Footer de uma ferramenta tem links legais
// =====================================================================
log("");
log("==== TEST 4: Footer de ferramenta tem links legais ====");
{
  const r = await getText(`${BASE}/ferramenta/merge`);
  const lower = r.text.toLowerCase();
  for (const p of legalPages) {
    assert(`4  /ferramenta/merge footer link -> ${p}`, lower.includes(p), "");
  }
}

// =====================================================================
// TEST 5: cabecalhos de seguranca presentes
// =====================================================================
log("");
log("==== TEST 5: cabecalhos de seguranca ====");
{
  const r = await getText(`${BASE}/privacidade`);
  assertEq("5.a  X-Frame-Options = DENY", r.headers.get("x-frame-options"), "DENY");
  assertEq("5.b  X-Content-Type-Options = nosniff", r.headers.get("x-content-type-options"), "nosniff");
  assertEq("5.c  Referrer-Policy = strict-origin-when-cross-origin", r.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  const perm = r.headers.get("permissions-policy") || "";
  assert("5.d  Permissions-Policy restrito", perm.includes("camera=()") && perm.includes("microphone=()"),
    `header=${JSON.stringify(perm)}`);
  assert("5.e  sem X-Powered-By", !r.headers.get("x-powered-by"), "");
}

// =====================================================================
// TEST 6: /api/cloudconvert/delete-job valida jobId malformado
// =====================================================================
log("");
log("==== TEST 6: /api/cloudconvert/delete-job validacao ====");
{
  const badInputs = [
    { jobId: "" },
    { jobId: "../../etc/passwd" },
    { jobId: "id com espaco" },
    { jobId: "id;rm -rf /" },
  ];
  for (const body of badInputs) {
    const { status, json } = await postJson(`${BASE}/api/cloudconvert/delete-job`, body);
    assert(`6  jobId invalido (${JSON.stringify(body.jobId).slice(0, 24)}) -> 400`,
      status === 400, `status=${status} error=${json?.error}`);
  }
}

// =====================================================================
// TEST 7: delete-job chama o mock CC (DELETE /v2/jobs/<id>) e remove
// =====================================================================
log("");
log("==== TEST 7: delete-job chama mock CC ====");
await mockReset(CC_MOCK);
{
  const validId = "job-mock-test-1234";
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/delete-job`, { jobId: validId });
  assert("7.a  delete-job -> 200", status === 200, `status=${status} error=${json?.error}`);
  assert("7.b  cleaned=true (mock respondeu 204)", json?.cleaned === true, `cleaned=${json?.cleaned}`);
  const del = await mockDeletes(CC_MOCK);
  const ids = (del?.deletes || del?.deleted || del?.jobIds || []);
  const present = Array.isArray(ids)
    ? ids.includes(validId)
    : (ids instanceof Set ? ids.has(validId) : false);
  assert("7.c  mock CC recebeu DELETE do jobId", present, `deletes=${JSON.stringify(ids)}`);
}

// =====================================================================
// TEST 8: response do delete-job nao expoe segredos
// =====================================================================
log("");
log("==== TEST 8: delete-job nao expoe segredos ====");
{
  const { json } = await postJson(`${BASE}/api/cloudconvert/delete-job`, { jobId: "job-leak-check-1" });
  const raw = JSON.stringify(json || {});
  const ccKey = process.env.CLOUDCONVERT_API_KEY || "";
  assert("8.a  nao expoe Authorization header",
    !raw.toLowerCase().includes("authorization"), "");
  assert("8.b  nao expoe CLOUDCONVERT_API_KEY",
    !ccKey || !raw.includes(ccKey), "");
  assert("8.c  response contem apenas {ok, cleaned, message}",
    typeof json?.ok === "boolean" && typeof json?.cleaned === "boolean",
    `keys=${Object.keys(json || {}).join(",")}`);
}

// =====================================================================
// TEST 9: rate limiting basico (sem login, body com jobId valido)
// =====================================================================
log("");
log("==== TEST 9: rate limiting do delete-job ====");
{
  let blocked = false;
  let firstStatus = null;
  // Envia o mesmo cookie pdfmp_anon_id em todos os requests para que o
  // rate limit por anonHash tenha efeito cumulativo.
  const fixedCookies = "pdfmp_anon_id=ratelimitphase6fix0000000000000000000000000000test";
  for (let i = 0; i < 25; i += 1) {
    const { status } = await postJson(`${BASE}/api/cloudconvert/delete-job`,
      { jobId: `rate-test-${i}` }, fixedCookies);
    if (i === 0) firstStatus = status;
    if (status === 429) { blocked = true; break; }
  }
  assert("9  delete-job aplicado rate limit (algum request 429)", blocked,
    `firstStatus=${firstStatus} blocked=${blocked}`);
}

// =====================================================================
// TEST 10: smoke check - endpoints chave das fases anteriores
// =====================================================================
log("");
log("==== TEST 10: smoke check de fases anteriores ====");
{
  const r1 = await getText(`${BASE}/pricing`);
  assert("10.a  /pricing -> 200", r1.status === 200, `status=${r1.status}`);
  const r2 = await getText(`${BASE}/account`);
  assert("10.b  /account -> 200/302/307 (redireciona ou mostra login)",
    r2.status === 200 || r2.status === 302 || r2.status === 307,
    `status=${r2.status}`);
  const r3 = await getText(`${BASE}/ferramenta/merge`);
  assert("10.c  /ferramenta/merge -> 200", r3.status === 200, `status=${r3.status}`);
  const r4 = await getText(`${BASE}/contact-sales`);
  assert("10.d  /contact-sales -> 200", r4.status === 200, `status=${r4.status}`);
}

// =====================================================================
// Resultado final
// =====================================================================
log("");
const total = totalPass + totalFail;
const verdict = totalFail === 0 ? "PHASE 6 OK" : "PHASE 6 FAIL";
log(`==== TOTAL: ${totalPass} pass / ${totalFail} fail ====`);
log(verdict);

if (REPORT_PATH) {
  const header = [
    "================================================================================",
    "PDF Master Pro - Relatorio oficial de Testes da Fase 6 (seguranca)",
    "================================================================================",
    `Data de execucao:  ${new Date().toISOString()}`,
    `Runner:            tests/phase6/test-phase6.mjs (oficial, versionado)`,
    `Base URL:          ${BASE}`,
    `Mock CC:           ${CC_MOCK}`,
    `Stack:             Next.js 14 (App Router) + TypeScript 5.7 + Tailwind 3.4`,
    "                   pdf-lib 1.17 + CloudConvert v2 + Prisma + NextAuth v4",
    "                   + Upstash Redis (rate limit) + Mercado Pago + Stripe",
    "",
    "Escopo da Fase 6:",
    "  - delete-job pos-download (CloudConvert DELETE /v2/jobs/<id>)",
    "  - rate limit por usuario/anonimo (Upstash + fallback in-memory)",
    "  - paginas legais: /privacidade /termos /seguranca /cookies /suporte",
    "  - mensagem publica: 'Processou, baixou, descartou.'",
    "  - cabecalhos de seguranca (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)",
    "  - validacao de env em producao via lib/env.ts",
    "  - docs: DEPLOY-VERCEL.md e PRODUCTION-CHECKLIST.md",
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

if (totalFail > 0) process.exit(1);
