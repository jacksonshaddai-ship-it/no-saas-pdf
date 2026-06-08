// mock-stripe.mjs
// Mock do Stripe usado pelos testes da Fase 5.
// Roda em http://localhost:3700.
//
// Endpoints:
//   POST /v1/checkout/sessions  -> cria session fake, devolve { id, url }
//   GET  /__stats               -> contadores
//   POST /__reset               -> zera contadores
//   GET  /__sessions            -> lista sessions (inspecao)

import http from "node:http";

const PORT = Number(process.env.MOCK_STRIPE_PORT || 3700);

let stats = { sessions: 0 };
const sessions = [];

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
      const ct = String(req.headers["content-type"] || "").toLowerCase();
      if (ct.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(text);
        const out = {};
        for (const [k, v] of params.entries()) {
          // Suporta chaves aninhadas tipo metadata[userId]
          const m = k.match(/^([^\[]+)\[([^\]]+)\]$/);
          if (m) {
            const root = m[1];
            const leaf = m[2];
            if (!out[root] || typeof out[root] !== "object") out[root] = {};
            out[root][leaf] = v;
          } else {
            out[k] = v;
          }
        }
        resolve(out);
        return;
      }
      try { resolve(text ? JSON.parse(text) : {}); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/__stats" && req.method === "GET") {
    return json(res, 200, { ...stats, sessions: sessions.length });
  }
  if (url.pathname === "/__reset" && req.method === "POST") {
    stats = { sessions: 0 };
    sessions.length = 0;
    return json(res, 200, { ok: true });
  }
  if (url.pathname === "/__sessions" && req.method === "GET") {
    return json(res, 200, { sessions });
  }

  if (url.pathname === "/v1/checkout/sessions" && req.method === "POST") {
    stats.sessions += 1;
    const body = await readBody(req);
    const id = `mock-cs-${Date.now()}-${stats.sessions}`;
    const userId = body?.metadata?.userId || body?.customer_reference || "anon";
    const planCode = body?.metadata?.planCode || "PREMIUM";
    const cycle = body?.metadata?.cycle || "monthly";
    const amount = Number(body?.["line_items[0][price_data][unit_amount]"] || 0);
    const currency = body?.["line_items[0][price_data][currency]"] || "usd";
    const sess = {
      id,
      url: `http://localhost:${PORT}/checkout/simulate?sid=${id}&user=${encodeURIComponent(userId)}`,
      amount_total: amount,
      currency,
      metadata: { userId, planCode, cycle },
      payment_status: "unpaid",
      status: "open",
      createdAt: new Date().toISOString(),
    };
    sessions.push(sess);
    return json(res, 200, sess);
  }

  if (url.pathname === "/checkout/simulate" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body><h1>Mock Stripe Checkout</h1>
      <pre>${url.searchParams.get("sid") || ""}</pre>
      <p>Esta URL e o alvo de redirecionamento. O pagamento real ocorre no Stripe;
      em teste, o webhook do proprio app simula a confirmacao.</p>
      </body></html>`);
    return;
  }

  return json(res, 404, { error: "not_found", path: url.pathname, method: req.method });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-stripe] listening on http://localhost:${PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[mock-stripe] received ${sig}, closing`);
    server.close(() => process.exit(0));
  });
}
