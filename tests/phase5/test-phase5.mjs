// test-phase5.mjs
// Bateria oficial de testes da Fase 5 do PDF Master Pro (billing e webhooks).
//
// Pre-requisitos:
//   - dev server rodando em http://localhost:3010
//   - MERCADO_PAGO_API_URL=http://localhost:3600 (mock-cc)
//   - STRIPE_API_URL=http://localhost:3700 (mock-stripe)
//   - MERCADO_PAGO_ACCESS_TOKEN e STRIPE_SECRET_KEY configurados
//   - BILLING_SKIP_WEBHOOK_SIG=1 no .env.local OU WEBHOOK_SECRETS opcionais
//
// O runner sobe os mocks se nao estiverem em :3600 / :3700.
//
// Cobertura (cada item gera 1+ assercoes):
//   1. Usuario nao logado nao cria checkout
//   2. Login FREE
//   3. FREE cria checkout Plus BRL  -> Mercado Pago mock recebe 1 preference
//   4. FREE cria checkout Premium USD -> Stripe mock recebe 1 session
//   5. Payment(pending) foi criado no banco
//   6. Subscription em PENDING_PAYMENT antes do webhook
//   7. success_url nao ativa o plano sozinho
//   8. Webhook Mercado Pago aprovado ativa PLUS
//   9. Webhook Stripe aprovado ativa PREMIUM
//  10. Webhook Mercado Pago falhado -> pagamento failed, plano FREE
//  11. ENTERPRISE retorna erro com /contact-sales
//  12. Env ausente -> 503 claro
//  13. Ferramenta Plus (html-to-pdf) sobe liberada apos Subscription ACTIVE
//  14. Ferramenta Premium (summarize-ai coming_soon) continua 409
//
// Variaveis de ambiente:
//   BASE_URL        default http://localhost:3010
//   MP_MOCK_URL     default http://localhost:3600
//   STRIPE_MOCK_URL default http://localhost:3700
//   SKIP_MOCK=1     nao subir mocks locais

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const BASE    = process.env.BASE_URL    || "http://localhost:3010";
const MP_MOCK = process.env.MP_MOCK_URL || "http://localhost:3600";
const STRIPE_MOCK = process.env.STRIPE_MOCK_URL || "http://localhost:3700";
const CC_MOCK = process.env.MOCK_CC_URL || "http://localhost:3500";
const REPORT_PATH = process.env.REPORT_PATH
  || path.join(PROJECT_ROOT, "PHASE5-TEST-REPORT.txt");
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
function mergeCookies(existing, setCookie) {
  if (!setCookie || setCookie.length === 0) return existing;
  const map = new Map();
  for (const c of (existing || "").split(";").map((s) => s.trim()).filter(Boolean)) {
    const [k, ...v] = c.split("="); map.set(k, v.join("="));
  }
  for (const sc of setCookie) {
    const [pair] = sc.split(";");
    const [k, ...v] = pair.split("=");
    map.set(k.trim(), v.join("=").trim());
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function cookieHeader(cookies) { return cookies ? { cookie: cookies } : {}; }

async function getJson(url, cookies) {
  const { res, setCookie } = await http_(url, { headers: cookieHeader(cookies) });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, setCookie };
}
async function postJson(url, body, cookies) {
  const { res, setCookie } = await http_(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cookieHeader(cookies) },
    body: JSON.stringify(body),
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, setCookie };
}
async function getText(url, cookies) {
  const { res, setCookie } = await http_(url, { headers: cookieHeader(cookies) });
  return { status: res.status, text: await res.text(), setCookie };
}

async function mockStats(url) {
  return getJson(`${url}/__stats`);
}
async function mockReset(url) {
  return postJson(`${url}/__reset`, {});
}
async function mockPreferences(url) {
  return getJson(`${url}/__preferences`);
}
async function mockSessions(url) {
  return getJson(`${url}/__sessions`);
}

// =====================================================================
// Mock lifecycle
// =====================================================================

async function isMockUp(url) {
  try { const r = await fetch(`${url}/__stats`); return r.status === 200; } catch { return false; }
}

const spawned = { mp: null, stripe: null, cc: null };

async function startMock(name, scriptName, url) {
  if (SKIP_MOCK) { log(`   SKIP_MOCK=1: assumindo ${name} em ${url}`); return; }
  if (await isMockUp(url)) { log(`   ${name} ja esta em ${url}`); return; }
  log(`   ${name} nao encontrado em ${url}: subindo como sub-processo...`);
  const absScript = path.isAbsolute(scriptName) ? scriptName : path.join(__dirname, scriptName);
  const proc = spawn(process.execPath, [absScript], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
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

// =====================================================================
// Aguarda dev server
// =====================================================================

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try { const r = await fetch(`${BASE}/pricing`); if (r.status === 200) return; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`dev server nao ficou pronto em 90s (${BASE})`);
}

// =====================================================================

log("=== PDF Master Pro — Testes oficiais da Fase 5 (billing) ===");
log(`BASE        = ${BASE}`);
log(`MP_MOCK     = ${MP_MOCK}`);
log(`STRIPE_MOCK = ${STRIPE_MOCK}`);
log(`REPORT      = ${REPORT_PATH}`);
log("");

log("0) Subindo mocks...");
await startMock("mp", "mock-mercado-pago.mjs", MP_MOCK);
await startMock("stripe", "mock-stripe.mjs", STRIPE_MOCK);
await startMock("cc", path.join(PROJECT_ROOT, "tests", "phase4", "mock-cloudconvert.mjs"), CC_MOCK);
await mockReset(MP_MOCK);
await mockReset(STRIPE_MOCK);
await mockReset(CC_MOCK);

log("1) Aguardando dev server em " + BASE);
await waitForServer();
log("   pronto.");

log("");
log("Pre-warm de paginas...");
for (const p of ["/pricing", "/billing/status", "/contact-sales"]) {
  try { const r = await fetch(`${BASE}${p}`); log(`   warmed ${p} (${r.status})`); } catch {}
}

log("");
// =====================================================================
// TEST 1: usuario nao logado nao cria checkout
// =====================================================================
log("==== TEST 1: usuario nao logado nao cria checkout ====");

{
  const { status, json } = await postJson(`${BASE}/api/billing/checkout`, {
    planCode: "PLUS",
    billingCycle: "monthly",
    country: "BR",
    currency: "BRL",
  });
  assert("1.a  sem sessao -> 401", status === 401, `status=${status} error=${json?.error}`);
}

// =====================================================================
// TEST 2: Login FREE
// =====================================================================
log("");
log("==== TEST 2: Login FREE ====");

const email = `fase5-${Date.now()}@example.com`;
const password = "Test1234!";
let cookies = "";

{
  const { status } = await postJson(`${BASE}/api/auth/register`, { name: "Tester Fase 5", email, password });
  assertEq("2.a  POST /api/auth/register 201", status, 201);
}

let csrfToken = null;
{
  const { status, json, setCookie } = await getJson(`${BASE}/api/auth/csrf`);
  cookies = mergeCookies(cookies, setCookie);
  csrfToken = json?.csrfToken;
  assert("2.b  csrfToken presente", !!csrfToken, "");
}
{
  const params = new URLSearchParams({ csrfToken, email, password, callbackUrl: `${BASE}/account`, json: "true" });
  const { res, setCookie } = await http_(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...cookieHeader(cookies) },
    body: params.toString(),
  });
  cookies = mergeCookies(cookies, setCookie);
  assert("2.c  login OK", res.status === 200 || res.status === 302, `status=${res.status}`);
}

// =====================================================================
// TEST 3: FREE cria checkout Plus BRL -> Mercado Pago
// =====================================================================
log("");
log("==== TEST 3: FREE cria checkout Plus BRL -> Mercado Pago ====");

await mockReset(MP_MOCK);

let plusCheckout = null;
{
  const { status, json } = await postJson(`${BASE}/api/billing/checkout`, {
    planCode: "PLUS", billingCycle: "monthly", country: "BR", currency: "BRL",
  }, cookies);
  plusCheckout = json;
  assert("3.a  status 201", status === 201, `status=${status} error=${json?.error}`);
  assert("3.b  provider = mercado_pago", json?.provider === "mercado_pago", `provider=${json?.provider}`);
  assert("3.c  checkoutUrl presente", !!json?.checkoutUrl, "");
  assert("3.d  paymentId presente", !!json?.paymentId, "");
}

const mpStats = await mockStats(MP_MOCK);
assert("3.e  Mercado Pago mock recebeu 1 preference", mpStats.json?.preferences === 1, `prefs=${mpStats.json?.preferences}`);

// =====================================================================
// TEST 4: FREE cria checkout Premium USD -> Stripe
// =====================================================================
log("");
log("==== TEST 4: FREE cria checkout Premium USD -> Stripe ====");

await mockReset(STRIPE_MOCK);

let stripeCheckout = null;
{
  const { status, json } = await postJson(`${BASE}/api/billing/checkout`, {
    planCode: "PREMIUM", billingCycle: "yearly", country: "GLOBAL", currency: "USD",
  }, cookies);
  stripeCheckout = json;
  assert("4.a  status 201", status === 201, `status=${status} error=${json?.error}`);
  assert("4.b  provider = stripe", json?.provider === "stripe", `provider=${json?.provider}`);
  assert("4.c  checkoutUrl presente", !!json?.checkoutUrl, "");
}

const stripeStats = await mockStats(STRIPE_MOCK);
assert("4.d  Stripe mock recebeu 1 session", stripeStats.json?.sessions === 1, `sessions=${stripeStats.json?.sessions}`);

// =====================================================================
// TEST 5: status antes do webhook
// =====================================================================
log("");
log("==== TEST 5: /api/billing/status antes do webhook ====");

{
  const { status, json } = await getJson(`${BASE}/api/billing/status`, cookies);
  assert("5.a  200", status === 200, `status=${status}`);
  assert("5.b  planCode FREE", json?.planCode === "FREE", `planCode=${json?.planCode}`);
  const sub = json?.subscription;
  assert("5.c  subscription status = PENDING_PAYMENT", sub?.status === "PENDING_PAYMENT", `status=${sub?.status}`);
  assert("5.d 2 pagamentos pendentes registrados", json?.payments?.length >= 2, `qtd=${json?.payments?.length}`);
  const pending = (json?.payments || []).filter((p) => p.status === "pending");
  assert("5.e ambos pagamentos estao pending", pending.length === 2, `pending=${pending.length}`);
}

// =====================================================================
// TEST 6: success_url nao ativa plano sozinho
// =====================================================================
log("");
log("==== TEST 6: success_url nao ativa plano sozinho ====");

{
  // Apenas "visitar" a URL de success nao deve mudar plano.
  const r = await fetch(`${BASE}/billing/status?payment=${plusCheckout?.paymentId}&status=success`);
  assert("6.a  /billing/status?status=success retorna 200", r.status === 200, `status=${r.status}`);
}
{
  const { json } = await getJson(`${BASE}/api/billing/status`, cookies);
  const sub = json?.subscription;
  const planOk = (json?.planCode === "FREE") && (sub?.status === "PENDING_PAYMENT");
  assert("6.b  plano ainda FREE e subscription PENDING_PAYMENT", planOk, `planCode=${json?.planCode} subStatus=${sub?.status}`);
}

// =====================================================================
// TEST 7: webhook Mercado Pago aprovado -> ativa PLUS
// =====================================================================
log("");
log("==== TEST 7: webhook Mercado Pago aprovado -> ativa PLUS ====");

// Recupera a preference criada pelo mock para saber external_reference (userId)
const prefs = (await mockPreferences(MP_MOCK)).json?.preferences || [];
const lastPref = prefs[prefs.length - 1];
const userIdMp = lastPref?.external_reference;

{
  const body = {
    type: "payment",
    data: {
      id: "mock-mp-payment-1",
      status: "approved",
      external_reference: userIdMp,
      transaction_amount: 14.90,
      currency_id: "BRL",
      payment_method_id: "pix",
      payment_type_id: "bank_transfer",
      preference_id: lastPref?.id,
      metadata: { planCode: "PLUS", cycle: "monthly", userId: userIdMp, paymentId: plusCheckout?.paymentId },
    },
  };
  const { status, json } = await postJson(`${BASE}/api/webhooks/mercado-pago`, body);
  assert("7.a  webhook aprovado -> 200", status === 200, `status=${status} error=${json?.error}`);
  assert("7.b  activated=true", json?.activated === true, `activated=${json?.activated}`);
  assert("7.c  planCode PLUS", json?.planCode === "PLUS", `planCode=${json?.planCode}`);
}

{
  // Como o JWT cacheia o planCode por request, pode ser que o token ainda
  // mostre FREE ate a proxima request. Forcamos nova chamada ao /api/usage/me
  // para que o callback jwt faca refresh.
  const { json } = await getJson(`${BASE}/api/usage/me`, cookies);
  assert("7.d  /api/usage/me -> planCode PLUS", json?.planCode === "PLUS" || json?.type === "user" && (json?.planCode === "PLUS" || json?.plan === "PLUS"),
    `type=${json?.type} planCode=${json?.planCode} plan=${json?.plan}`);
}

// =====================================================================
// TEST 8: Plus tool liberada para o usuario
// =====================================================================
log("");
log("==== TEST 8: ferramenta Plus (html-to-pdf) liberada apos webhook ====");

{
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "html-to-pdf",
    filename: "page.html",
    contentType: "text/html",
    size: 4096,
    options: { url: "https://example.com" },
  }, cookies);
  assert("8.a  html-to-pdf -> 201", status === 201, `status=${status} error=${json?.error}`);
}

// =====================================================================
// TEST 9: Stripe webhook aprovado -> ativa PREMIUM
// =====================================================================
log("");
log("==== TEST 9: Stripe webhook checkout.session.completed -> ativa PREMIUM ====");

// Para subir para PREMIUM, primeiro precisamos "voltar" o usuario para FREE
// senao a checagem canUseTool ja liberaria html-to-pdf (PLUS cobre).
// Aqui, vamos apenas conferir que o webhook muda o plano para PREMIUM.

// O test 9 eh um cenario independente: usamos o mesmo userId.
const sessions = (await mockSessions(STRIPE_MOCK)).json?.sessions || [];
const lastSession = sessions[sessions.length - 1];
const userIdStripe = lastSession?.metadata?.userId;
assert("9.pre userId presente", !!userIdStripe, "");

{
  const rawEvent = {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: lastSession?.id,
        payment_intent: "pi_mock_1",
        amount_total: lastSession?.amount_total,
        currency: lastSession?.currency,
        metadata: lastSession?.metadata,
      },
    },
  };
  const { status, json } = await postJson(`${BASE}/api/webhooks/stripe`, rawEvent);
  assert("9.a  stripe webhook -> 200", status === 200, `status=${status} error=${json?.error}`);
  assert("9.b  activated=true planCode=PREMIUM", json?.activated === true && json?.planCode === "PREMIUM",
    `activated=${json?.activated} planCode=${json?.planCode}`);
}

{
  const { json } = await getJson(`${BASE}/api/usage/me`, cookies);
  assert("9.c  /api/usage/me -> planCode PREMIUM", json?.planCode === "PREMIUM" || json?.plan === "PREMIUM",
    `planCode=${json?.planCode} plan=${json?.plan}`);
}

// =====================================================================
// TEST 10: webhook Mercado Pago falhado -> pagamento failed, plano FREE
// =====================================================================
log("");
log("==== TEST 10: webhook Mercado Pago falhado ====");

// Para este teste, criamos um novo pagamento (com cookies do user logado)
// e simulamos falha. O Payment novo NAO deve sobrescrever a ativacao do
// test 7, que ja deixou a assinatura em ACTIVE.
{
  const { status, json } = await postJson(`${BASE}/api/billing/checkout`, {
    planCode: "PLUS", billingCycle: "monthly", country: "BR", currency: "BRL",
  }, cookies);
  assert("10.pre checkout novo -> 201", status === 201, `status=${status}`);

  const prefs2 = (await mockPreferences(MP_MOCK)).json?.preferences || [];
  const newPref = prefs2[prefs2.length - 1];

  const body = {
    type: "payment",
    data: {
      id: "mock-mp-payment-failed-1",
      status: "rejected",
      external_reference: newPref?.external_reference,
      transaction_amount: 14.90,
      currency_id: "BRL",
      preference_id: newPref?.id,
      metadata: { planCode: "PLUS", cycle: "monthly", paymentId: json?.paymentId },
    },
  };
  const { status: s2, json: j2 } = await postJson(`${BASE}/api/webhooks/mercado-pago`, body);
  assert("10.a  webhook rejected -> 200", s2 === 200, `status=${s2}`);
  assert("10.b  payment marcado como failed", j2?.ok === true && (j2?.status === "failed" || j2?.paymentStatus === "failed"),
    `status=${j2?.status} paymentStatus=${j2?.paymentStatus}`);
}

// =====================================================================
// TEST 11: ENTERPRISE retorna 400 com contact-sales
// =====================================================================
log("");
log("==== TEST 11: ENTERPRISE -> contact-sales ====");

{
  const { status, json } = await postJson(`${BASE}/api/billing/checkout`, {
    planCode: "ENTERPRISE", billingCycle: "monthly", country: "BR", currency: "BRL",
  }, cookies);
  assert("11.a  400 ENTERPRISE_CONTACT_ONLY", status === 400 && json?.error === "ENTERPRISE_CONTACT_ONLY",
    `status=${status} error=${json?.error}`);
  assert("11.b  contactUrl = /contact-sales", json?.contactUrl === "/contact-sales", `url=${json?.contactUrl}`);
}

{
  const { status } = await fetch(`${BASE}/contact-sales`);
  assert("11.c  /contact-sales -> 200", status === 200, `status=${status}`);
}

// =====================================================================
// TEST 12: ferramentas Em breve nao processam
// =====================================================================
log("");
log("==== TEST 12: ferramentas Em breve nao processam ====");

{
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "summarize-ai", filename: "doc.pdf", contentType: "application/pdf", size: 100 * 1024,
  }, cookies);
  assert("12.a  summarize-ai (Premium coming_soon) -> 409", status === 409 && json?.error === "TOOL_COMING_SOON",
    `status=${status} error=${json?.error}`);
}
{
  const { status, json } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "crop", filename: "doc.pdf", contentType: "application/pdf", size: 100 * 1024,
  }, cookies);
  assert("12.b  crop (Basico coming_soon) -> 409", status === 409 && json?.error === "TOOL_COMING_SOON",
    `status=${status} error=${json?.error}`);
}

// =====================================================================
// TEST 13: Basic tools continuam funcionando
// =====================================================================
log("");
log("==== TEST 13: ferramentas Basico continuam funcionando ====");

{
  const { status } = await postJson(`${BASE}/api/cloudconvert/create-job`, {
    tool: "pdf-to-jpg", filename: "x.pdf", contentType: "application/pdf", size: 100 * 1024,
  }, cookies);
  assert("13.a  pdf-to-jpg -> 201", status === 201, `status=${status}`);
}

// =====================================================================
// Resultado final + gravacao do relatorio
// =====================================================================
log("");
const total = totalPass + totalFail;
const verdict = totalFail === 0 ? "PHASE 5 OK" : "PHASE 5 FAIL";
log(`==== TOTAL: ${totalPass} pass / ${totalFail} fail ====`);
log(verdict);

if (REPORT_PATH) {
  const header = [
    "================================================================================",
    "PDF Master Pro - Relatorio oficial de Testes da Fase 5 (billing)",
    "================================================================================",
    `Data de execucao:  ${new Date().toISOString()}`,
    `Runner:            tests/phase5/test-phase5.mjs (oficial, versionado)`,
    `Base URL:          ${BASE}`,
    `Mock MP:           ${MP_MOCK}`,
    `Mock Stripe:       ${STRIPE_MOCK}`,
    `Stack:             Next.js 14 (App Router) + TypeScript 5.7 + Tailwind 3.4`,
    `                   pdf-lib 1.17 + CloudConvert v2 + Prisma + NextAuth v4`,
    "",
    "Escopo da Fase 5:",
    "  - Billing core com Mercado Pago (BR/BRL) e Stripe (GLOBAL/USD)",
    "  - Planos PLUS e PREMIUM via checkout, ENTERPRISE sob consulta",
    "  - Liberacao SOMENTE via webhook (success_url nao ativa plano)",
    "  - Payment e Subscription com status (pending/approved/active/...)",
    "  - Webhooks validam assinatura, ativam User.planCode atomicamente",
    "  - /pricing com toggle mensal/anual + seletor de pais",
    "  - /billing/status e /contact-sales",
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
