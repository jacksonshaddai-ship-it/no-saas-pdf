import { NextResponse } from "next/server";
import { CloudConvertError, createJob, ensureApiKey, findImportTask, validateUploadRequest } from "@/lib/cloudconvert";
import { UsageError } from "@/lib/anonymous-usage";
import { checkUsageLimit, incrementUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    ensureApiKey();

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new CloudConvertError("Corpo precisa ser JSON válido.", 400);
    }

    const rawPayload = payload as Record<string, unknown> | null;
    const rawToolId = rawPayload && typeof rawPayload.tool === "string" ? rawPayload.tool : "";
    const rawSize = rawPayload ? Number(rawPayload.size) : NaN;
    const probeSize = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 0;

    const limitCheck = await checkUsageLimit(request, rawToolId, probeSize);
    if (!limitCheck.ok) {
      return NextResponse.json(
        {
          error: limitCheck.code,
          message: limitCheck.message,
          upgradeUrl: limitCheck.upgradeUrl,
          mode: limitCheck.mode,
          usage: limitCheck.usage,
        },
        { status: limitCheck.status },
      );
    }

    const { tool, filename, size, contentType, options } = validateUploadRequest(payload);

    const tasks = tool.buildTasks({ filename, options });
    const job = await createJob(tasks);
    const importTask = findImportTask(job, "import-file");

    const increment = await incrementUsage(request, tool.id, size, true);

    const response = NextResponse.json(
      {
        jobId: job.id,
        importTaskId: importTask.id,
        importTaskName: importTask.name,
        exportTaskName: "export-file",
        upload: {
          url: importTask.result!.form!.url,
          parameters: importTask.result!.form!.parameters,
        },
        usage: increment.usage,
        mode: increment.mode,
        echo: {
          tool: tool.id,
          filename,
          contentType,
          size,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );

    // Para visitantes anônimos, garante que o cookie seja setado em uma resposta 201 também.
    if (increment.mode === "anonymous") {
      const { applyAnonCookie, getAnonIdentity } = await import("@/lib/anonymous-usage");
      applyAnonCookie(response, getAnonIdentity(request));
    }

    return response;
  } catch (error) {
    if (error instanceof CloudConvertError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof UsageError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
