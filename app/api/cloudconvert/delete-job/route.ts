// app/api/cloudconvert/delete-job/route.ts
// Solicita a exclusao do job no CloudConvert apos o usuario ter baixado o
// arquivo final. A politica do produto eh: "processou, baixou, descartou".
//
// Esta rota NAO armazena o PDF em lugar nenhum e NAO expoe a chave do
// CloudConvert. Ela apenas repassa a chamada ao provedor. Se a exclusao
// falhar, retornamos 200 mesmo assim para nao bloquear o usuario, mas
// logamos o erro no servidor para posterior investigacao.

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimitIdentityFromRequest } from "@/lib/rate-limit";
import { CloudConvertError, deleteJob, ensureApiKey } from "@/lib/cloudconvert";
import { checkAnonCallRate, checkUserCallRate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  jobId: z
    .string()
    .min(1, "jobId obrigatorio.")
    .max(200, "jobId muito longo.")
    .regex(/^[A-Za-z0-9._\-:]+$/, "jobId invalido."),
});

export async function POST(request: Request) {
  try {
    ensureApiKey();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON", message: "Corpo precisa ser JSON valido." },
        { status: 400 },
      );
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400 },
      );
    }

    // Rate limit: usuario logado, e anonimo (chave do fingerprint).
    const session = await auth();
    if (session?.user?.id) {
      const limit = await checkUserCallRate(session.user.id, "delete-job", 30, 60);
      if (!limit.ok) {
        return NextResponse.json(
          { ok: false, error: "RATE_LIMITED", message: "Muitas requisicoes de limpeza. Tente novamente em instantes." },
          { status: 429 },
        );
      }
    } else {
      const identity = rateLimitIdentityFromRequest(request);
      const limit = await checkAnonCallRate(identity, "delete-job", 10, 60);
      if (!limit.ok) {
        return NextResponse.json(
          { ok: false, error: "RATE_LIMITED", message: "Muitas requisicoes de limpeza. Tente novamente em instantes." },
          { status: 429 },
        );
      }
    }

    try {
      await deleteJob(parsed.data.jobId);
    } catch (err) {
      // A politica do produto diz: nao bloquear o usuario se a limpeza
      // falhar. Apenas registrar o erro de forma segura.
      console.error(
        "[delete-job] Falha ao excluir job no provedor",
        { jobId: parsed.data.jobId, error: err instanceof Error ? err.message : String(err) },
      );
      return NextResponse.json(
        {
          ok: true,
          cleaned: false,
          message: "Nao foi possivel confirmar a limpeza no provedor. O arquivo continua fora do nosso servidor.",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, cleaned: true, jobId: parsed.data.jobId },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CloudConvertError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao solicitar limpeza do job.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
