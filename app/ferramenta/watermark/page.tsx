"use client";

import { useState } from "react";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("watermark")!;

export default function WatermarkPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENCIAL");
  const [state, setState] = useState<ProcessingState>("empty");
  const [message, setMessage] = useState<string | null>(null);
  const file = files[0] ?? null;

  function updateFiles(nextFiles: File[]) {
    setFiles(nextFiles.slice(0, 1));
    setMessage(null);
    setState(nextFiles.length > 0 ? "selected" : "empty");
  }

  function removeFile() {
    updateFiles([]);
  }

  async function handleWatermark() {
    try {
      assertPdf(file);
      if (!text.trim()) throw new Error("Digite o texto da marca d'água.");
      setState("processing");
      setMessage("Aplicando marca d'água no documento.");

      const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      pdfDoc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = Math.max(28, Math.min(width, height) / 10);
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        page.drawText(text, {
          color: rgb(0.82, 0.08, 0.08),
          font,
          opacity: 0.22,
          rotate: degrees(-35),
          size: fontSize,
          x: width / 2 - textWidth / 2,
          y: height / 2,
        });
      });

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, `marca_dagua_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage("Marca d'água aplicada com sucesso.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao aplicar marca d'água.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="watermark-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />

        <label className="block rounded-lg border border-slate-200 bg-white p-5">
          <span className="mb-2 block text-sm font-black text-slate-700">Texto da marca d'água</span>
          <input
            className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            onChange={(event) => setText(event.target.value)}
            placeholder="Ex: CONFIDENCIAL, RASCUNHO, CÓPIA"
            type="text"
            value={text}
          />
        </label>

        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!file || !text.trim() || state === "processing"}
          onClick={handleWatermark}
          type="button"
        >
          Aplicar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
