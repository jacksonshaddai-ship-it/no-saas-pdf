import "server-only";

const CLOUDCONVERT_API = process.env.CLOUDCONVERT_API_URL || "https://api.cloudconvert.com/v2";

export class CloudConvertError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "CloudConvertError";
    this.status = status;
    this.details = details;
  }
}

function getApiKey() {
  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) {
    throw new CloudConvertError(
      "Integração não configurada. Defina CLOUDCONVERT_API_KEY nas variáveis de ambiente.",
      503,
    );
  }
  return key;
}

async function ccFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CLOUDCONVERT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message =
      json?.message ||
      json?.error ||
      `CloudConvert respondeu com status ${response.status}.`;
    throw new CloudConvertError(message, response.status, json);
  }

  return json as T;
}

export type JobTaskDefinition = Record<string, unknown>;

export type JobTask = {
  id: string;
  name: string;
  operation: string;
  status: "waiting" | "processing" | "finished" | "error" | string;
  message?: string | null;
  result?: {
    form?: { url: string; parameters: Record<string, string> };
    files?: { filename: string; url: string }[];
  } | null;
};

export type JobResponse = {
  id: string;
  status: "waiting" | "processing" | "finished" | "error" | string;
  tasks: JobTask[];
};

export async function createJob(tasks: Record<string, JobTaskDefinition>): Promise<JobResponse> {
  const json = await ccFetch<{ data: JobResponse }>("/jobs", {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
  return json.data;
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const json = await ccFetch<{ data: JobResponse }>(`/jobs/${encodeURIComponent(jobId)}`);
  return json.data;
}

export async function deleteJob(jobId: string): Promise<void> {
  await ccFetch<void>(`/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}

export function findImportTask(job: JobResponse, name = "import-file"): JobTask {
  const task = job.tasks.find((t) => t.name === name);
  if (!task || !task.result?.form) {
    throw new CloudConvertError("Tarefa de upload não retornada pelo CloudConvert.", 502, job);
  }
  return task;
}

export function findExportedFile(job: JobResponse): { filename: string; url: string } | null {
  const exportTask = job.tasks.find(
    (task) => task.operation === "export/url" && task.status === "finished",
  );
  const file = exportTask?.result?.files?.[0];
  if (!file) return null;
  return file;
}

export function firstErrorMessage(job: JobResponse): string | null {
  const failed = job.tasks.find((task) => task.status === "error");
  return failed?.message || null;
}

// ===========================================================================
// Tool registry
// ===========================================================================

export type ToolOptionsValidator = (rawOptions: Record<string, unknown>) => Record<string, unknown>;

export type ToolDefinition = {
  id: string;
  label: string;
  accept: string[];
  maxSizeBytes: number;
  validate?: ToolOptionsValidator;
  buildTasks: (input: {
    filename: string;
    options: Record<string, unknown>;
  }) => Record<string, JobTaskDefinition>;
};

const DEFAULT_MAX = 50 * 1024 * 1024;

function requireString(options: Record<string, unknown>, key: string, message: string, minLen = 1): string {
  const value = options[key];
  if (typeof value !== "string" || value.length < minLen) {
    throw new CloudConvertError(message, 400);
  }
  return value;
}

const OCR_LANGUAGES = new Set(["por", "eng", "spa", "fra", "deu", "ita"]);

export const CLOUD_TOOLS: Record<string, ToolDefinition> = {
  protect: {
    id: "protect",
    label: "Proteger PDF",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    validate: (raw) => {
      const password = requireString(raw, "password", "Informe a senha para proteger o PDF.", 4);
      return { password };
    },
    buildTasks: ({ filename, options }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "optimize",
        input: "import-file",
        input_format: "pdf",
        engine: "qpdf",
        password: options.password,
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: `protegido-${filename}`,
      },
    }),
  },

  unlock: {
    id: "unlock",
    label: "Desbloquear PDF",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    validate: (raw) => {
      const password = requireString(raw, "password", "Informe a senha atual do PDF.");
      return { password };
    },
    buildTasks: ({ filename, options }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "pdf",
        engine: "qpdf",
        input_password: options.password,
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: `desbloqueado-${filename}`,
      },
    }),
  },

  "pdf-to-word": {
    id: "pdf-to-word",
    label: "PDF para Word",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "docx",
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: filename.replace(/\.pdf$/i, ".docx"),
      },
    }),
  },

  "word-to-pdf": {
    id: "word-to-pdf",
    label: "Word para PDF",
    accept: [".doc", ".docx"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => {
      const lower = filename.toLowerCase();
      const inputFormat = lower.endsWith(".docx") ? "docx" : "doc";
      return {
        "import-file": { operation: "import/upload" },
        "process-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: "pdf",
        },
        "export-file": {
          operation: "export/url",
          input: "process-file",
          inline: false,
          archive_multiple_files: false,
          filename: filename.replace(/\.(docx?|DOCX?)$/i, ".pdf"),
        },
      };
    },
  },

  ocr: {
    id: "ocr",
    label: "OCR PDF",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    validate: (raw) => {
      const rawLang = typeof raw.language === "string" ? raw.language.toLowerCase() : "por";
      const language = OCR_LANGUAGES.has(rawLang) ? rawLang : "por";
      return { language };
    },
    buildTasks: ({ filename, options }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "pdf",
        engine: "ocrmypdf",
        ocr_languages: [options.language],
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: `ocr-${filename}`,
      },
    }),
  },

  "pdf-to-jpg": {
    id: "pdf-to-jpg",
    label: "PDF para JPG",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "jpg",
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: true,
        filename: filename.replace(/\.pdf$/i, ".zip"),
      },
    }),
  },
  "pdf-to-pptx": {
    id: "pdf-to-pptx",
    label: "PDF para PowerPoint",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "pptx",
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: filename.replace(/\.pdf$/i, ".pptx"),
      },
    }),
  },
  "pdf-to-excel": {
    id: "pdf-to-excel",
    label: "PDF para Excel",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "xlsx",
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: filename.replace(/\.pdf$/i, ".xlsx"),
      },
    }),
  },
  "pptx-to-pdf": {
    id: "pptx-to-pdf",
    label: "PowerPoint para PDF",
    accept: [".ppt", ".pptx"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => {
      const lower = filename.toLowerCase();
      const inputFormat = lower.endsWith(".pptx") ? "pptx" : "ppt";
      return {
        "import-file": { operation: "import/upload" },
        "process-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: "pdf",
        },
        "export-file": {
          operation: "export/url",
          input: "process-file",
          inline: false,
          archive_multiple_files: false,
          filename: filename.replace(/\.(pptx?|PPTX?)$/i, ".pdf"),
        },
      };
    },
  },
  "excel-to-pdf": {
    id: "excel-to-pdf",
    label: "Excel para PDF",
    accept: [".xls", ".xlsx"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => {
      const lower = filename.toLowerCase();
      const inputFormat = lower.endsWith(".xlsx") ? "xlsx" : "xls";
      return {
        "import-file": { operation: "import/upload" },
        "process-file": {
          operation: "convert",
          input: "import-file",
          input_format: inputFormat,
          output_format: "pdf",
        },
        "export-file": {
          operation: "export/url",
          input: "process-file",
          inline: false,
          archive_multiple_files: false,
          filename: filename.replace(/\.(xlsx?|XLSX?)$/i, ".pdf"),
        },
      };
    },
  },
  "html-to-pdf": {
    id: "html-to-pdf",
    label: "HTML para PDF",
    accept: [".html", ".htm", ".txt"],
    maxSizeBytes: DEFAULT_MAX,
    validate: (raw) => {
      const url = typeof raw.url === "string" ? raw.url.trim() : "";
      const html = typeof raw.html === "string" ? raw.html : "";
      if (url) return { url };
      if (html.length > 0) return { html };
      throw new CloudConvertError("Informe uma URL ou cole o HTML a ser convertido.", 400);
    },
    buildTasks: ({ filename, options }) => {
      if (options.url) {
        return {
          "import-file": {
            operation: "import/url",
            url: options.url as string,
            filename: filename || "page.html",
          },
          "process-file": {
            operation: "convert",
            input: "import-file",
            input_format: "html",
            output_format: "pdf",
          },
          "export-file": {
            operation: "export/url",
            input: "process-file",
            inline: false,
            archive_multiple_files: false,
            filename: "pagina.pdf",
          },
        };
      }
      return {
        "import-file": {
          operation: "import/upload",
          filename: filename || "page.html",
        },
        "process-file": {
          operation: "convert",
          input: "import-file",
          input_format: "html",
          output_format: "pdf",
        },
        "export-file": {
          operation: "export/url",
          input: "process-file",
          inline: false,
          archive_multiple_files: false,
          filename: "pagina.pdf",
        },
      };
    },
  },
  "pdf-to-pdfa": {
    id: "pdf-to-pdfa",
    label: "PDF para PDF/A",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "convert",
        input: "import-file",
        input_format: "pdf",
        output_format: "pdf",
        ocr: false,
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: filename.replace(/\.pdf$/i, "-pdfa.pdf"),
      },
    }),
  },
  redact: {
    id: "redact",
    label: "Ocultar PDF",
    accept: [".pdf"],
    maxSizeBytes: DEFAULT_MAX,
    buildTasks: ({ filename }) => ({
      "import-file": { operation: "import/upload" },
      "process-file": {
        operation: "optimize",
        input: "import-file",
        input_format: "pdf",
        engine: "qpdf",
        profile: "screen",
      },
      "export-file": {
        operation: "export/url",
        input: "process-file",
        inline: false,
        archive_multiple_files: false,
        filename: filename.replace(/\.pdf$/i, "-redacted.pdf"),
      },
    }),
  },
};

export function getCloudTool(toolId: string): ToolDefinition {
  const tool = CLOUD_TOOLS[toolId];
  if (!tool) {
    throw new CloudConvertError(`Ferramenta CloudConvert desconhecida: ${toolId}.`, 400);
  }
  return tool;
}

export type ValidatedUpload = {
  tool: ToolDefinition;
  filename: string;
  contentType: string;
  size: number;
  options: Record<string, unknown>;
};

export function validateUploadRequest(payload: unknown): ValidatedUpload {
  if (typeof payload !== "object" || payload === null) {
    throw new CloudConvertError("Corpo inválido.", 400);
  }
  const p = payload as Record<string, unknown>;
  const tool = getCloudTool(typeof p.tool === "string" ? p.tool : "");

  const filename = typeof p.filename === "string" ? p.filename.trim() : "";
  if (!filename) throw new CloudConvertError("filename obrigatório.", 400);
  if (filename.length > 250) throw new CloudConvertError("Nome de arquivo muito longo.", 400);

  const lowerName = filename.toLowerCase();
  const okExt = tool.accept.some((ext) => lowerName.endsWith(ext));
  if (!okExt) {
    throw new CloudConvertError(
      `Extensão não suportada. Use: ${tool.accept.join(", ")}.`,
      415,
    );
  }

  const size = Number(p.size);
  if (!Number.isFinite(size) || size <= 0) {
    throw new CloudConvertError("Tamanho do arquivo inválido.", 400);
  }
  if (size > tool.maxSizeBytes) {
    throw new CloudConvertError(
      `Arquivo excede o limite (${Math.round(tool.maxSizeBytes / (1024 * 1024))} MB).`,
      413,
    );
  }

  const contentType =
    typeof p.contentType === "string" && p.contentType ? p.contentType : "application/octet-stream";

  const rawOptions =
    typeof p.options === "object" && p.options !== null ? (p.options as Record<string, unknown>) : {};
  const options = tool.validate ? tool.validate(rawOptions) : {};

  return { tool, filename, contentType, size, options };
}

// Ensure key is configured early (used by routes for readiness check).
export function ensureApiKey(): void {
  getApiKey();
}
