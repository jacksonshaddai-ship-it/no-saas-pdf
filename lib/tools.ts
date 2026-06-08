import type { PlanCode } from "@/lib/plans";

// ===========================================================================
// Catalogo de ferramentas
// Cada ferramenta tem status, processingMode e minimumPlan.
// O backend usa isso em canUseTool() antes de chamar CloudConvert.
// ===========================================================================

export type ToolStatus = "local" | "api" | "soon";
export type ToolProcessingMode = "local" | "cloud" | "future";
export type ToolTier = "BASIC" | "PLUS" | "PREMIUM" | "ENTERPRISE";

export type ToolCategoryId =
  | "organizar-pdf"
  | "otimizar-pdf"
  | "converter-de-pdf"
  | "converter-para-pdf"
  | "editar-pdf"
  | "seguranca-pdf"
  | "avancado";

export type ToolIcon =
  | "merge"
  | "split"
  | "compress"
  | "pdfWord"
  | "wordPdf"
  | "pdfPptx"
  | "pptxPdf"
  | "pdfExcel"
  | "excelPdf"
  | "pdfJpg"
  | "jpgPdf"
  | "ocr"
  | "rotate"
  | "watermark"
  | "lock"
  | "unlock"
  | "organize"
  | "number"
  | "signature"
  | "crop"
  | "repair"
  | "htmlPdf"
  | "pdfPdfa"
  | "redact"
  | "compare"
  | "forms"
  | "summarizeAi"
  | "translate";

export type Tool = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  icon: ToolIcon;
  category: ToolCategoryId;
  status: ToolStatus;
  processingMode: ToolProcessingMode;
  href: string;
  accent: "red" | "amber" | "emerald" | "cyan" | "indigo" | "violet" | "slate";
  accept: string;
  multiple: boolean;
  localProcessing: boolean;
  minimumPlan: PlanCode;
  visibleInCatalog: boolean;
  isBasicTool: boolean;
  tier: ToolTier;
  badge: "Básico" | "Plus" | "Premium" | "Enterprise" | "Em breve";
  // O backend bloqueia antes de chamar o provedor quando a ferramenta nao esta implementada.
  implemented: boolean;
};

// ===========================================================================
// Categorias exibidas no menu / home
// ===========================================================================

export const toolCategories: { id: ToolCategoryId; label: string; description: string }[] = [
  {
    id: "organizar-pdf",
    label: "Organizar PDF",
    description: "Una, divida e reorganize documentos com uma experiência simples.",
  },
  {
    id: "otimizar-pdf",
    label: "Otimizar PDF",
    description: "Reduza tamanho, prepare arquivos e melhore documentos escaneados.",
  },
  {
    id: "converter-de-pdf",
    label: "Converter de PDF",
    description: "Transforme PDFs em Word, Excel, PowerPoint, JPG e mais.",
  },
  {
    id: "converter-para-pdf",
    label: "Converter para PDF",
    description: "Converta documentos Word, Excel, PowerPoint, JPG e HTML em PDF.",
  },
  {
    id: "editar-pdf",
    label: "Editar PDF",
    description: "Ajuste páginas, adicione elementos e finalize arquivos para envio.",
  },
  {
    id: "seguranca-pdf",
    label: "Segurança PDF",
    description: "Proteção, desbloqueio, redação e comparação de documentos.",
  },
  {
    id: "avancado",
    label: "Avançado",
    description: "OCR avançado, formulários, IA e tradução (em breve).",
  },
];

// ===========================================================================
// Catalogo completo (29 ferramentas planejadas)
// ===========================================================================

export const tools: Tool[] = [
  // -----------------------------------------------------------------------
  // BASICO — 21 ferramentas (ANONYMOUS + FREE)
  // -----------------------------------------------------------------------
  {
    id: "merge",
    name: "Juntar PDF",
    description: "Junte vários PDFs na ordem desejada, sem enviar arquivos para um servidor.",
    shortDescription: "Una dois ou mais PDFs em um único arquivo.",
    icon: "merge",
    category: "organizar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/merge",
    accent: "red",
    accept: ".pdf,application/pdf",
    multiple: true,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "split",
    name: "Dividir PDF",
    description: "Extraia um intervalo de páginas de um PDF diretamente no navegador.",
    shortDescription: "Separe páginas ou intervalos do documento.",
    icon: "split",
    category: "organizar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/split",
    accent: "amber",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "organize",
    name: "Organizar PDF",
    description: "Reordene páginas, remova folhas e monte um arquivo final com precisão.",
    shortDescription: "Reorganize páginas do documento.",
    icon: "organize",
    category: "organizar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/organize",
    accent: "indigo",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "page-numbers",
    name: "Numerar páginas",
    description: "Adicione numeração consistente em rodapés ou cabeçalhos do PDF.",
    shortDescription: "Inclua números nas páginas.",
    icon: "number",
    category: "editar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/page-numbers",
    accent: "violet",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "rotate",
    name: "Rotacionar PDF",
    description: "Gire todas as páginas em 90, 180 ou 270 graus sem upload externo.",
    shortDescription: "Corrija a orientação das páginas.",
    icon: "rotate",
    category: "editar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/rotate",
    accent: "cyan",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "watermark",
    name: "Marca d'água",
    description: "Adicione uma marca d'água textual em todas as páginas do documento.",
    shortDescription: "Insira texto discreto sobre as páginas.",
    icon: "watermark",
    category: "editar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/watermark",
    accent: "red",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "sign",
    name: "Assinar PDF",
    description: "Insira uma imagem de assinatura no PDF, escolhendo página, posição e tamanho.",
    shortDescription: "Adicione assinatura ao documento.",
    icon: "signature",
    category: "editar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/sign",
    accent: "red",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "compress",
    name: "Comprimir PDF",
    description: "Faça uma compressão leve regravando o PDF e removendo excessos quando possível.",
    shortDescription: "Reduza o tamanho com processamento leve.",
    icon: "compress",
    category: "otimizar-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/compress",
    accent: "emerald",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG para PDF",
    description: "Transforme imagens em PDFs com fluxo preparado para automação profissional.",
    shortDescription: "Crie PDF a partir de uma ou mais imagens.",
    icon: "jpgPdf",
    category: "converter-para-pdf",
    status: "local",
    processingMode: "local",
    href: "/ferramenta/jpg-to-pdf",
    accent: "cyan",
    accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    multiple: true,
    localProcessing: true,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "pdf-to-word",
    name: "PDF para Word",
    description: "Converta PDFs em DOCX com integração CloudConvert.",
    shortDescription: "Transforme PDF em documento editável.",
    icon: "pdfWord",
    category: "converter-de-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/pdf-to-word",
    accent: "indigo",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "pdf-to-pptx",
    name: "PDF para PowerPoint",
    description: "Converta PDFs em apresentações PPTX editáveis via CloudConvert.",
    shortDescription: "Exporte PDF como slides editáveis.",
    icon: "pdfPptx",
    category: "converter-de-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/pdf-to-pptx",
    accent: "amber",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "pdf-to-excel",
    name: "PDF para Excel",
    description: "Converta PDFs em planilhas XLSX editáveis via CloudConvert.",
    shortDescription: "Extraia tabelas de PDF em planilha.",
    icon: "pdfExcel",
    category: "converter-de-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/pdf-to-excel",
    accent: "emerald",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "word-to-pdf",
    name: "Word para PDF",
    description: "Converta DOC e DOCX em PDF com integração CloudConvert.",
    shortDescription: "Gere PDFs a partir de documentos Word.",
    icon: "wordPdf",
    category: "converter-para-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/word-to-pdf",
    accent: "cyan",
    accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "pptx-to-pdf",
    name: "PowerPoint para PDF",
    description: "Converta apresentações PPT e PPTX em PDF via CloudConvert.",
    shortDescription: "Transforme slides em PDF.",
    icon: "pptxPdf",
    category: "converter-para-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/pptx-to-pdf",
    accent: "amber",
    accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "excel-to-pdf",
    name: "Excel para PDF",
    description: "Converta planilhas XLS e XLSX em PDF via CloudConvert.",
    shortDescription: "Gere PDFs a partir de planilhas.",
    icon: "excelPdf",
    category: "converter-para-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/excel-to-pdf",
    accent: "emerald",
    accept: ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF para JPG",
    description: "Converta páginas de PDF em imagens JPG via CloudConvert.",
    shortDescription: "Exporte páginas como imagens JPG.",
    icon: "pdfJpg",
    category: "converter-de-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/pdf-to-jpg",
    accent: "emerald",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "ocr",
    name: "OCR PDF",
    description: "Reconheça texto em PDFs escaneados via CloudConvert OCR.",
    shortDescription: "Extraia texto pesquisável de PDFs escaneados.",
    icon: "ocr",
    category: "otimizar-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/ocr",
    accent: "violet",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "protect",
    name: "Proteger PDF",
    description: "Adicione senha e criptografia via CloudConvert.",
    shortDescription: "Adicione senha e regras de acesso.",
    icon: "lock",
    category: "seguranca-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/protect",
    accent: "slate",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "unlock",
    name: "Desbloquear PDF",
    description: "Remova a senha de PDFs (quando você conhece a credencial).",
    shortDescription: "Remova a senha do PDF.",
    icon: "unlock",
    category: "seguranca-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/unlock",
    accent: "amber",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Básico",
    implemented: true,
  },
  {
    id: "crop",
    name: "Recortar PDF",
    description: "Recorte margens ou áreas específicas de todas as páginas do PDF.",
    shortDescription: "Ajuste margens e recortes.",
    icon: "crop",
    category: "editar-pdf",
    status: "soon",
    processingMode: "future",
    href: "/ferramenta/crop",
    accent: "indigo",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Em breve",
    implemented: false,
  },
  {
    id: "repair",
    name: "Reparar PDF",
    description: "Tente recuperar um PDF corrompido reescrevendo sua estrutura.",
    shortDescription: "Recupere PDFs corrompidos.",
    icon: "repair",
    category: "otimizar-pdf",
    status: "soon",
    processingMode: "future",
    href: "/ferramenta/repair",
    accent: "amber",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "ANONYMOUS",
    visibleInCatalog: true,
    isBasicTool: true,
    tier: "BASIC",
    badge: "Em breve",
    implemented: false,
  },

  // -----------------------------------------------------------------------
  // PLUS — 6 ferramentas intermediarias
  // -----------------------------------------------------------------------
  {
    id: "html-to-pdf",
    name: "HTML para PDF",
    description: "Cole HTML ou uma URL e gere um PDF renderizado.",
    shortDescription: "Converta HTML em PDF.",
    icon: "htmlPdf",
    category: "converter-para-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/html-to-pdf",
    accent: "violet",
    accept: ".html,.htm,text/html,text/plain",
    multiple: false,
    localProcessing: false,
    minimumPlan: "PLUS",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PLUS",
    badge: "Plus",
    implemented: true,
  },
  {
    id: "pdf-to-pdfa",
    name: "PDF para PDF/A",
    description: "Converta PDFs para o formato de arquivamento PDF/A.",
    shortDescription: "Converta para PDF/A.",
    icon: "pdfPdfa",
    category: "otimizar-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/pdf-to-pdfa",
    accent: "indigo",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "PLUS",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PLUS",
    badge: "Plus",
    implemented: true,
  },
  {
    id: "redact",
    name: "Ocultar PDF",
    description: "Aplique tarjas pretas em áreas sensíveis antes de compartilhar.",
    shortDescription: "Oculte trechos sensíveis.",
    icon: "redact",
    category: "seguranca-pdf",
    status: "api",
    processingMode: "cloud",
    href: "/ferramenta/redact",
    accent: "slate",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "PLUS",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PLUS",
    badge: "Plus",
    implemented: true,
  },
  {
    id: "compare",
    name: "Comparar PDF",
    description: "Compare dois PDFs e veja as diferenças por página.",
    shortDescription: "Compare dois PDFs lado a lado.",
    icon: "compare",
    category: "avancado",
    status: "soon",
    processingMode: "future",
    href: "/ferramenta/compare",
    accent: "cyan",
    accept: ".pdf,application/pdf",
    multiple: true,
    localProcessing: false,
    minimumPlan: "PLUS",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PLUS",
    badge: "Em breve",
    implemented: false,
  },
  {
    id: "forms",
    name: "Formulários PDF",
    description: "Crie e preencha formulários PDF básicos.",
    shortDescription: "Crie formulários PDF.",
    icon: "forms",
    category: "avancado",
    status: "soon",
    processingMode: "future",
    href: "/ferramenta/forms",
    accent: "emerald",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "PLUS",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PLUS",
    badge: "Em breve",
    implemented: false,
  },

  // -----------------------------------------------------------------------
  // PREMIUM — 2 ferramentas com IA / recursos avancados
  // -----------------------------------------------------------------------
  {
    id: "summarize-ai",
    name: "Resumir PDF com IA",
    description: "Resumo automático do conteúdo do PDF usando IA.",
    shortDescription: "Resuma o PDF com IA.",
    icon: "summarizeAi",
    category: "avancado",
    status: "soon",
    processingMode: "future",
    href: "/ferramenta/summarize-ai",
    accent: "red",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "PREMIUM",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PREMIUM",
    badge: "Premium",
    implemented: false,
  },
  {
    id: "translate",
    name: "Traduzir PDF",
    description: "Traduza o conteúdo de um PDF para outro idioma.",
    shortDescription: "Traduza o conteúdo do PDF.",
    icon: "translate",
    category: "avancado",
    status: "soon",
    processingMode: "future",
    href: "/ferramenta/translate",
    accent: "violet",
    accept: ".pdf,application/pdf",
    multiple: false,
    localProcessing: false,
    minimumPlan: "PREMIUM",
    visibleInCatalog: true,
    isBasicTool: false,
    tier: "PREMIUM",
    badge: "Premium",
    implemented: false,
  },
];

// ===========================================================================
// Helpers
// ===========================================================================

export function getToolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategoryId): Tool[] {
  return tools.filter((tool) => tool.category === category);
}

export function getVisibleTools(): Tool[] {
  return tools.filter((tool) => tool.visibleInCatalog);
}

export function getBasicTools(): Tool[] {
  return tools.filter((tool) => tool.isBasicTool);
}

export function getPlusTools(): Tool[] {
  return tools.filter((tool) => tool.tier === "PLUS");
}

export function getPremiumTools(): Tool[] {
  return tools.filter((tool) => tool.tier === "PREMIUM");
}

export function getImplementedTools(): Tool[] {
  return tools.filter((tool) => tool.implemented);
}

export function getComingSoonTools(): Tool[] {
  return tools.filter((tool) => !tool.implemented);
}

// Lista dos IDs de ferramentas que tem pagina propria (App Router).
// As demais sao resolvidas via app/ferramenta/[id]/page.tsx.
export const EXPLICIT_TOOL_PAGES = new Set<string>([
  "merge",
  "split",
  "compress",
  "rotate",
  "watermark",
  "organize",
  "page-numbers",
  "sign",
  "jpg-to-pdf",
  "pdf-to-jpg",
  "pdf-to-word",
  "pdf-to-pptx",
  "pdf-to-excel",
  "word-to-pdf",
  "pptx-to-pdf",
  "excel-to-pdf",
  "ocr",
  "protect",
  "unlock",
  "html-to-pdf",
  "pdf-to-pdfa",
  "redact",
  "crop",
  "repair",
  "compare",
  "forms",
  "summarize-ai",
  "translate",
]);
