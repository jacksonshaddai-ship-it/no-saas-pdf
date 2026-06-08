"use client";

import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolById } from "@/lib/tools";

const tool = getToolById("pdf-to-word")!;

export default function PdfToWordPage() {
  return (
    <ToolPageLayout tool={tool}>
      <ApiToolWorkspace
        tool={tool}
        buttonLabel="Converter para Word"
        outputExtension="docx"
        helperNotice={
          <>
            A conversão ocorre via CloudConvert. Defina
            <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">CLOUDCONVERT_API_KEY</code>
            antes do deploy. O arquivo vai do navegador direto para o CloudConvert (até 50 MB).
          </>
        }
      />
    </ToolPageLayout>
  );
}
