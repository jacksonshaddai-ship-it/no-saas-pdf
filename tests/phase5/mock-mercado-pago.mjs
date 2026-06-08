// mock-mercado-pago.mjs
// Mock do Mercado Pago usado pelos testes da Fase 5.
// Roda em http://localhost:3600.
//
// Endpoints:
//   POST /checkout/preferences     -> cria preference fake, devolve { id, init_point, sandbox_init_point }
//   GET  /__stats                  -> contadores
//   POST /__reset                  -> zera contadores
//   GET  /__preferences            -> lista preferences criadas (para inspecao em testes)
//
// NAO tenta emular o provedor real. Apenas registra as chamadas e devolve
// URLs que apontam para o proprio mock, para que os testes possam simular
// o fluxo "cliente abriu o checkout, mas o pagamento eh confirmado por webhook".

import http from "node:http";

const PORT = Number(process.env.MOCK_MP_PORT || 3600);

let stats = { preferences: 0 };
const preferences = [];

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      try { resolve(text ? JSON.parse(text) : {}); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/__stats" && req.method === "GET") {
    return json(res, 200, { ...stats, preferences: preferences.length });
  }
  if (url.pathname === "/__reset" && req.method === "POST") {
    stats = { preferences: 0 };
    preferences.length = 0;
    return json(res, 200, { ok: true });
  }
  if (url.pathname === "/__preferences" && req.method === "GET") {
    return json(res, 200, { preferences });
  }

  if (url.pathname === "/checkout/preferences" && req.method === "POST") {
    stats.preferences += 1;
    const body = await readBody(req);
    const id = `mock-pref-${Date.now()}-${stats.preferences}`;
    const item = body?.items?.[0] || {};
    const userId = body?.external_reference || body?.metadata?.userId || "anon";
    const pref = {
      id,
      init_point: `http://localhost:${PORT}/checkout/simulate?pref=${id}&user=${encodeURIComponent(userId)}`,
      sandbox_init_point: `http://localhost:${PORT}/checkout/simulate?pref=${id}&user=${encodeURIComponent(userId)}`,
      items: [item],
      external_reference: userId,
      metadata: body?.metadata || {},
      notification_url: body?.notification_url || null,
      back_urls: body?.back_urls || null,
      createdAt: new Date().toISOString(),
    };
    preferences.push(pref);
    return json(res, 201, pref);
  }

  if (url.pathname === "/checkout/simulate" && req.method === "GET") {
    // Pagina HTML minima para o teste "abrir" o checkout.
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body><h1>Mock Mercado Pago Checkout</h1>
      <pre>${url.searchParams.get("pref") || ""}</pre>
      <p>Esta URL e o alvo de redirecionamento. Em producao, o pagamento ocorre no
      provedor real; em teste, o webhook do proprio app simula a confirmacao.</p>
      </body></html>`);
    return;
  }

  return json(res, 404, { error: "not_found", path: url.pathname, method: req.method });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-mp] listening on http://localhost:${PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[mock-mp] received ${sig}, closing`);
    server.close(() => process.exit(0));
  });
}
