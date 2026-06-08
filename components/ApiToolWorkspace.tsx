"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Tool } from "@/lib/tools";
import { ProcessingStatus, type ProcessingState } from "./ProcessingStatus";
import { UploadDropzone } from "./UploadDropzone";
import { downloadBytes, formatBytes, sanitizeFilename } from "@/lib/browser-file";

export type ApiToolWorkspaceProps = {
  tool: Tool;
  buildOptions?: () => Record<string, unknown>;
  isReady?: (file: File | null) => boolean;
  extraFields?: ReactNode;
  buttonLabel?: string;
  helperNotice?: ReactNode;
  outputExtension?: string;
};

type CreateJobResponse = {
  jobId: string;
  importTaskId: string;
  importTaskName: string;
  exportTaskName: string;
  upload: { url: string; parameters: Record<string, string> };
  usage?: MeUsageStatus;
  mode?: "anonymous" | "user";
};

type StatusResponse = {
  status: "waiting" | "processing" | "finished" | "error" | string;
  downloadUrl?: string;
  filename?: string;
  error?: string;
};

type MeUsageStatus =
  | {
      type: "anonymous";
      limit: number;
      used: number;
      remaining: number;
      resetAt: string;
      maxFileMb: number;
      backend?: "upstash" | "memory";
    }
  | {
      type: "user";
      planCode: "FREE" | "PREMIUM" | "BUSINESS";
      dailyLimit: number;
      monthlyLimit: number;
      maxFileMb: number;
      dailyUsed: number;
      monthlyUsed: number;
      remainingDaily: number;
      remainingMonthly: number;
      resetDailyAt: string;
      resetMonthlyAt: string;
    };

type QuotaErrorCode =
  | "ANON_LIMIT_EXCEEDED"
  | "FILE_TOO_LARGE"
  | "USER_LIMIT_EXCEEDED"
  | "USER_FILE_TOO_LARGE"
  | "USER_PLAN_UNSUPPORTED"
  | "NOT_CONFIGURED"
  | "TOOL_NOT_FOUND"
  | "TOOL_COMING_SOON"
  | "TOOL_REQUIRES_PLUS"
  | "TOOL_REQUIRES_PREMIUM"
  | "TOOL_REQUIRES_ENTERPRISE"
  | "PLAN_LIMIT_EXCEEDED";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const STATUS_LABEL: Record<string, string> = {
  waiting: "Aguardando início no provedor",
  processing: "Provedor processando o arquivo",
};

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function formatResetTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function ApiToolWorkspace({
  tool,
  buildOptions,
  isReady,
  extraFields,
  buttonLabel,
  helperNotice,
  outputExtension,
}: ApiToolWorkspaceProps) {
  const { data: session, status: sessionStatus } = useSession();
  const isLoggedIn = sessionStatus === "authenticated" && Boolean(session?.user);

  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("empty");
  const [message, setMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<MeUsageStatus | null>(null);
  const [usageError, setUsageError] = useState<{ code: QuotaErrorCode; message: string } | null>(null);
  const file = files[0] ?? null;

  const refreshUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/usage/me", { cache: "no-store" });
      if (response.status === 503) {
        setUsage(null);
        setUsageError({ code: "NOT_CONFIGURED", message: "Limite de uso não está configurado no servidor." });
        return;
      }
      if (!response.ok) {
        setUsage(null);
        return;
      }
      const data = (await response.json()) as MeUsageStatus & { error?: string };
      if (data.error) {
        setUsageError({ code: "NOT_CONFIGURED", message: data.error });
        return;
      }
      setUsage(data);
      setUsageError(null);
    } catch {
      setUsage(null);
    }
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage, isLoggedIn]);

  function updateFiles(nextFiles: File[]) {
    setFiles(nextFiles.slice(0, 1));
    setMessage(null);
    setUsageError(null);
    setState(nextFiles.length > 0 ? "selected" : "empty");
  }

  function removeFile() {
    updateFiles([]);
  }

  function defaultFilename() {
    if (!file) return tool.id;
    const base = sanitizeFilename(file.name);
    if (!outputExtension) return `${tool.id}-${base}`;
    return `${tool.id}-${base.replace(/\.[^.]+$/i, "")}.${outputExtension}`;
  }

  function renderUsageBanner() {
    if (usageError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-black">{usageError.code === "NOT_CONFIGURED" ? "Limite indisponível" : "Limite atingido"}</p>
          <p className="mt-1 text-red-700">{usageError.message}</p>
        </div>
      );
    }
    if (!usage) return null;

    if (usage.type === "user") {
      const dailyExhausted = usage.remainingDaily <= 0;
      const monthlyExhausted = usage.remainingMonthly <= 0;
      const exhausted = dailyExhausted || monthlyExhausted;
      return (
        <div
          className={`rounded-lg border p-4 text-sm ${
            exhausted
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="font-black">
                {exhausted
                  ? dailyExhausted
                    ? "Cota diária esgotada"
                    : "Cota mensal esgotada"
                  : `Restam ${usage.remainingDaily} de ${usage.dailyLimit} hoje · ${usage.remainingMonthly} de ${usage.monthlyLimit} no mês`}
              </strong>
              <span className="ml-2 text-xs uppercase tracking-wider text-slate-500">
                Conta grátis · até {usage.maxFileMb} MB
              </span>
            </span>
            <Link
              className="text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-700"
              href="/pricing"
            >
              Ver planos
            </Link>
          </div>
        </div>
      );
    }

    const exhausted = usage.remaining <= 0;
    return (
      <div
        className={`rounded-lg border p-4 text-sm ${
          exhausted
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="font-black">
              {exhausted ? "Cota diária esgotada" : `Restam ${usage.remaining} de ${usage.limit} tarefas grátis hoje`}
            </strong>
            <span className="ml-2 text-xs uppercase tracking-wider text-slate-500">
              Visitante · até {usage.maxFileMb} MB · Renova às {formatResetTime(usage.resetAt)} (UTC)
            </span>
          </span>
          <div className="flex gap-3 text-xs font-black uppercase tracking-wider">
            <Link className="text-red-600 hover:text-red-700" href="/register">
              Criar conta grátis
            </Link>
            <Link className="text-slate-700 hover:text-slate-900" href="/pricing">
              Ver planos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function renderQuotaActions(code: QuotaErrorCode) {
    if (!isLoggedIn) {
      return (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
            href="/register"
          >
            Criar conta grátis
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            href="/pricing"
          >
            Ver Premium
          </Link>
        </div>
      );
    }
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
          href="/pricing"
        >
          Ver Premium
        </Link>
        <button
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          onClick={refreshUsage}
          type="button"
        >
          Atualizar cota
        </button>
      </div>
    );
  }

  async function createJobOnServer(): Promise<CreateJobResponse> {
    setMessage("Preparando job no servidor.");
    const options = buildOptions ? buildOptions() : {};
    const response = await fetch("/api/cloudconvert/create-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: tool.id,
        filename: file!.name,
        contentType: file!.type || "application/octet-stream",
        size: file!.size,
        options,
      }),
    });

    if (response.status === 429 || response.status === 413 || response.status === 403 || response.status === 409) {
      const json = await response.json().catch(() => ({}));
      const code = (json?.error as QuotaErrorCode) || "ANON_LIMIT_EXCEEDED";
      const upgradeUrl = (json?.upgradeUrl as string) || "/pricing";
      if (code === "FILE_TOO_LARGE" || code === "USER_FILE_TOO_LARGE") {
        setUsageError({ code, message: json?.message || "Arquivo acima do limite." });
      } else if (code === "ANON_LIMIT_EXCEEDED" || code === "USER_LIMIT_EXCEEDED" || code === "PLAN_LIMIT_EXCEEDED") {
        setUsageError({ code, message: json?.message || "Você atingiu o limite." });
      } else if (code === "TOOL_COMING_SOON") {
        setUsageError({ code, message: json?.message || "Esta ferramenta estará disponível em breve." });
      } else if (code === "TOOL_REQUIRES_PLUS" || code === "TOOL_REQUIRES_PREMIUM" || code === "TOOL_REQUIRES_ENTERPRISE") {
        setUsageError({ code, message: json?.message || "Faça upgrade para usar esta ferramenta." });
      } else if (code === "NOT_CONFIGURED") {
        setUsageError({ code, message: json?.message || "Limite de uso não configurado no servidor." });
      } else {
        setUsageError({ code, message: json?.message || "Não foi possível processar a requisição." });
      }
      if (json?.usage) {
        setUsage(json.usage as MeUsageStatus);
      }
      throw new QuotaError(json?.message || "Não foi possível processar.", code, response.status, upgradeUrl);
    }

    if (!response.ok) {
      let errorText = `Falha ao criar job (${response.status}).`;
      try {
        const json = await response.json();
        if (json?.error) errorText = json.error;
      } catch {
        /* ignore */
      }
      throw new Error(errorText);
    }

    const data = (await response.json()) as CreateJobResponse;
    if (data.usage) {
      setUsage(data.usage);
    }
    return data;
  }

  async function uploadDirectToCloudConvert(job: CreateJobResponse): Promise<void> {
    setMessage(`Enviando arquivo direto para o provedor (${formatBytes(file!.size)}).`);

    const form = new FormData();
    for (const [key, value] of Object.entries(job.upload.parameters)) {
      form.append(key, value);
    }
    form.append("file", file!, file!.name);

    const uploadResponse = await fetch(job.upload.url, {
      method: "POST",
      body: form,
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text().catch(() => "");
      throw new Error(
        `Upload para o provedor falhou (${uploadResponse.status}). ${text || ""}`.trim(),
      );
    }
  }

  async function pollUntilDone(jobId: string): Promise<StatusResponse> {
    const start = Date.now();
    let attempt = 0;

    while (true) {
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        throw new Error("Tempo esgotado aguardando o provedor. Tente novamente.");
      }

      attempt += 1;
      const response = await fetch(`/api/cloudconvert/status?jobId=${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        let errorText = `Falha ao consultar status (${response.status}).`;
        try {
          const json = await response.json();
          if (json?.error) errorText = json.error;
        } catch {
          /* ignore */
        }
        throw new Error(errorText);
      }

      const data = (await response.json()) as StatusResponse;

      if (data.status === "finished") return data;
      if (data.status === "error") {
        throw new Error(data.error || "Provedor retornou erro durante o processamento.");
      }

      const label = STATUS_LABEL[data.status] || `Status do job: ${data.status}`;
      setMessage(`${label} (tentativa ${attempt}).`);
      await delay(POLL_INTERVAL_MS);
    }
  }

  async function downloadResult(result: StatusResponse): Promise<void> {
    if (!result.downloadUrl) {
      throw new Error("URL de download não retornada pelo provedor.");
    }
    setMessage("Baixando arquivo final.");
    const response = await fetch(result.downloadUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Falha ao baixar arquivo final (${response.status}).`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const filename = result.filename || defaultFilename();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    downloadBytes(bytes, filename, contentType);
    setState("completed");
    setMessage(`Arquivo pronto. ${formatBytes(bytes.byteLength)} baixados como ${filename}.`);
  }

  // Politica de retencao: "processou, baixou, descartou". Apos o download
  // bem-sucedido, pedimos ao servidor para solicitar a limpeza do job no
  // provedor. Isso NAO bloqueia o usuario se falhar (a politica do
  // produto eh: nao armazenar arquivos, mas tambem nao bloquear o
  // usuario por erro de limpeza).
  async function requestCleanup(jobId: string): Promise<void> {
    try {
      const r = await fetch("/api/cloudconvert/delete-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
        cache: "no-store",
      });
      if (!r.ok) {
        return;
      }
      const j = await r.json().catch(() => null);
      if (j && j.ok === true && j.cleaned === false) {
        // A limpeza no provedor falhou, mas isso nao impede o uso.
        console.warn("[cleanup] Provedor nao confirmou a limpeza do job.");
      }
    } catch {
      // Erro de rede: ignoramos. A experiencia do usuario nao depende disso.
    }
  }

  async function handleRun() {
    if (!file) {
      setState("error");
      setMessage("Selecione um arquivo antes de continuar.");
      return;
    }
    if (isReady && !isReady(file)) {
      setState("error");
      setMessage("Preencha os campos obrigatórios antes de enviar.");
      return;
    }

    try {
      setState("processing");
      const job = await createJobOnServer();
      await uploadDirectToCloudConvert(job);
      const result = await pollUntilDone(job.jobId);
      await downloadResult(result);
      // Solicita limpeza pos-download em background. NAO esperamos e NAO
      // bloqueamos o usuario se a limpeza falhar.
      void requestCleanup(job.jobId);
      refreshUsage();
    } catch (error) {
      if (error instanceof QuotaError) {
        setState("error");
        setMessage(error.message);
        return;
      }
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao processar arquivo.");
    }
  }

  const disabled = !file || state === "processing" || (isReady ? !isReady(file) : false);
  const quotaBlock =
    usageError?.code === "ANON_LIMIT_EXCEEDED" ||
    usageError?.code === "USER_LIMIT_EXCEEDED" ||
    usageError?.code === "PLAN_LIMIT_EXCEEDED" ||
    usageError?.code === "TOOL_REQUIRES_PLUS" ||
    usageError?.code === "TOOL_REQUIRES_PREMIUM" ||
    usageError?.code === "TOOL_REQUIRES_ENTERPRISE" ||
    usageError?.code === "NOT_CONFIGURED";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {helperNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {helperNotice}
        </div>
      )}

      {renderUsageBanner()}

      <UploadDropzone
        accept={tool.accept}
        files={files}
        id={`${tool.id}-upload`}
        multiple={false}
        onFilesChange={updateFiles}
        onRemove={removeFile}
        state={state}
      />

      {extraFields}

      <ProcessingStatus message={message} state={state} />

      {usageError && renderQuotaActions(usageError.code)}

      <button
        className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled || quotaBlock}
        onClick={handleRun}
        type="button"
      >
        {buttonLabel || `Executar ${tool.name}`}
      </button>

      <p className="text-center text-xs text-slate-500">
        Arquivo processado. Nao armazenamos seus arquivos permanentemente.{" "}
        <Link className="underline" href="/privacidade">Saiba mais</Link>.
      </p>
    </div>
  );
}

class QuotaError extends Error {
  code: QuotaErrorCode;
  status: number;
  upgradeUrl: string;
  constructor(message: string, code: QuotaErrorCode, status: number, upgradeUrl: string) {
    super(message);
    this.name = "QuotaError";
    this.code = code;
    this.status = status;
    this.upgradeUrl = upgradeUrl;
  }
}
