// mock-cloudconvert.mjs
// Mock do CloudConvert v2 usado pelos testes da Fase 4 do PDF Master Pro.
// Roda em http://localhost:3500.
//
// Endpoints:
//   POST /v2/jobs              -> devolve um job fake com 3 tasks
//   POST /v2/upload/<jobId>    -> aceita upload do form (200)
//   GET  /__stats              -> contadores internos
//   POST /__reset              -> zera contadores
//
// O mock NAO tenta emular conversao real. Apenas registra as chamadas
// para que os testes consigam provar que o backend do app NAO chamou o
// provedor externo quando bloqueou por plano ou por status (coming_soon).

import http from "node:http";

const PORT = Number(process.env.MOCK_CC_PORT || 3500);

let stats = { jobs: 0, uploads: 0, deletes: 0 };
const deletedJobs = new Set();

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      const text = buf.toString("utf8");
      try {
        resolve(text ? JSON.parse(text) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/__stats" && req.method === "GET") {
    return json(res, 200, { ...stats, deleted: deletedJobs.size });
  }
  if (url.pathname === "/__reset" && req.method === "POST") {
    stats = { jobs: 0, uploads: 0, deletes: 0 };
    deletedJobs.clear();
    return json(res, 200, { ok: true, stats });
  }
  if (url.pathname === "/__deletes" && req.method === "GET") {
    return json(res, 200, { deleted: [...deletedJobs] });
  }

  if (url.pathname === "/v2/jobs" && req.method === "POST") {
    stats.jobs += 1;
    await readBody(req);
    const jobId = `mock-job-${Date.now()}-${stats.jobs}`;
    return json(res, 200, {
      data: {
        id: jobId,
        status: "waiting",
        tasks: [
          {
            id: "import-file",
            name: "import-file",
            operation: "import/upload",
            status: "waiting",
            result: {
              form: {
                url: `http://localhost:${PORT}/v2/upload/${jobId}`,
                parameters: {},
              },
            },
          },
          {
            id: "process-file",
            name: "process-file",
            operation: "convert",
            status: "waiting",
            result: null,
          },
          {
            id: "export-file",
            name: "export-file",
            operation: "export/url",
            status: "waiting",
            result: null,
          },
        ],
      },
    });
  }

  if (url.pathname.startsWith("/v2/upload/") && req.method === "POST") {
    stats.uploads += 1;
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => json(res, 200, { ok: true }));
    return;
  }

  // DELETE /v2/jobs/<jobId> - exclusao de job (limpeza pos-download)
  const deleteMatch = url.pathname.match(/^\/v2\/jobs\/([^\/]+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const jobId = deleteMatch[1];
    if (!jobId) {
      return json(res, 400, { error: "jobId obrigatorio" });
    }
    stats.deletes += 1;
    deletedJobs.add(jobId);
    return json(res, 204, {});
  }

  return json(res, 404, { error: "not_found", path: url.pathname, method: req.method });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-cc] listening on http://localhost:${PORT}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[mock-cc] received ${sig}, closing`);
    server.close(() => process.exit(0));
  });
}
