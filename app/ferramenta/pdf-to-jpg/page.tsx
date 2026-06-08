"use client";

import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolById } from "@/lib/tools";

const tool = getToolById("pdf-to-jpg")!;

export default function PdfToJpgPage() {
  return (
    <ToolPageLayout tool={tool}>
      <ApiToolWorkspace
        tool={tool}
        buttonLabel="Converter páginas em JPG"
        outputExtension="zip"
        helperNotice={
          <>
            Cada página vira um JPG e o resultado vem em arquivo ZIP. Necessita
            <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">CLOUDCONVERT_API_KEY</code>
            configurada. O upload é direto do navegador para o CloudConvert.
          </>
        }
      />
    </ToolPageLayout>
  );
}
