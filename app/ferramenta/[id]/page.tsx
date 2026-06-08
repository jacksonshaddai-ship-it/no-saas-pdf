import { notFound } from "next/navigation";
import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { FutureToolWorkspace } from "@/components/FutureToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { EXPLICIT_TOOL_PAGES, getToolById, tools } from "@/lib/tools";

const OUTPUT_EXTENSIONS: Record<string, string> = {
  "pdf-to-word": "docx",
  "pdf-to-pptx": "pptx",
  "pdf-to-excel": "xlsx",
  "word-to-pdf": "pdf",
  "pptx-to-pdf": "pdf",
  "excel-to-pdf": "pdf",
  "pdf-to-jpg": "zip",
  "pdf-to-pdfa": "pdf",
  redact: "pdf",
  "html-to-pdf": "pdf",
};

const BUTTON_LABELS: Record<string, string> = {
  "pdf-to-word": "Converter para Word",
  "pdf-to-pptx": "Converter para PowerPoint",
  "pdf-to-excel": "Converter para Excel",
  "word-to-pdf": "Converter Word para PDF",
  "pptx-to-pdf": "Converter PowerPoint para PDF",
  "excel-to-pdf": "Converter Excel para PDF",
  "pdf-to-jpg": "Converter para JPG",
  ocr: "Executar OCR",
  protect: "Proteger PDF",
  unlock: "Desbloquear PDF",
  "pdf-to-pdfa": "Converter para PDF/A",
  redact: "Aplicar ocultação",
  "html-to-pdf": "Converter HTML para PDF",
};

// Gera pagina estatica apenas para ferramentas SEM page explicita.
export function generateStaticParams() {
  return tools
    .filter((t) => t.visibleInCatalog && !EXPLICIT_TOOL_PAGES.has(t.id))
    .map((tool) => ({ id: tool.id }));
}

export default function ToolPage({ params }: { params: { id: string } }) {
  const tool = getToolById(params.id);
  if (!tool) notFound();

  // Implementada e processa na nuvem -> workspace API.
  if (tool.implemented && tool.processingMode === "cloud") {
    return (
      <ToolPageLayout tool={tool}>
        <ApiToolWorkspace
          tool={tool}
          outputExtension={OUTPUT_EXTENSIONS[tool.id]}
          buttonLabel={BUTTON_LABELS[tool.id] || `Executar ${tool.name}`}
          helperNotice={
            <span>
              Processamento via CloudConvert. O arquivo vai do navegador direto para o provedor.
            </span>
          }
        />
      </ToolPageLayout>
    );
  }

  // Implementada e local -> workspace de placeholder (nao chama API).
  if (tool.implemented && tool.processingMode === "local") {
    return (
      <ToolPageLayout tool={tool}>
        <FutureToolWorkspace tool={tool} />
      </ToolPageLayout>
    );
  }

  // Coming soon.
  return (
    <ToolPageLayout tool={tool}>
      <FutureToolWorkspace tool={tool} />
    </ToolPageLayout>
  );
}
