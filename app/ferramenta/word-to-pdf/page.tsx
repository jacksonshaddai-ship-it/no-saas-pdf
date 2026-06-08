"use client";

import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolById } from "@/lib/tools";

const tool = getToolById("word-to-pdf")!;

export default function WordToPdfPage() {
  return (
    <ToolPageLayout tool={tool}>
      <ApiToolWorkspace
        tool={tool}
        buttonLabel="Converter para PDF"
        outputExtension="pdf"
        helperNotice={
          <>
            Suporta DOC e DOCX. A conversão ocorre via CloudConvert. Configure
            <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">CLOUDCONVERT_API_KEY</code>
            antes do deploy. O arquivo é enviado direto do navegador para o CloudConvert.
          </>
        }
      />
    </ToolPageLayout>
  );
}
