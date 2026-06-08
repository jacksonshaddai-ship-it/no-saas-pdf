import { NextResponse } from "next/server";
import {
  CloudConvertError,
  ensureApiKey,
  findExportedFile,
  firstErrorMessage,
  getJob,
} from "@/lib/cloudconvert";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    ensureApiKey();

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId) {
      throw new CloudConvertError("Parâmetro jobId obrigatório.", 400);
    }

    const job = await getJob(jobId);

    if (job.status === "error") {
      const detail = firstErrorMessage(job) || "Job retornou erro.";
      return NextResponse.json(
        { status: "error", error: detail },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (job.status === "finished") {
      const file = findExportedFile(job);
      if (!file) {
        return NextResponse.json(
          { status: "error", error: "Job finalizado mas sem arquivo de saída." },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json(
        {
          status: "finished",
          downloadUrl: file.url,
          filename: file.filename,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { status: job.status },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CloudConvertError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao consultar status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
