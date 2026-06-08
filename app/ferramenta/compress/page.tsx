"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, formatBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("compress")!;

export default function CompressPage() {
  const [files, setFiles] = useState<File[]>([]);
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

  async function handleCompress() {
    try {
      assertPdf(file);
      setState("processing");
      setMessage("Regravando o PDF com otimização leve.");

      const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
      pdfDoc.setProducer("PDF Master Pro");
      pdfDoc.setCreator("PDF Master Pro");
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });

      const diff = file.size - pdfBytes.byteLength;
      const percent = file.size > 0 ? Math.abs((diff / file.size) * 100).toFixed(1) : "0.0";
      const resultLabel = diff >= 0 ? "redução" : "variação";

      downloadBytes(pdfBytes, `otimizado_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage(`Original: ${formatBytes(file.size)}. Resultado: ${formatBytes(pdfBytes.byteLength)}. ${resultLabel}: ${percent}%.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao comprimir PDF.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="compress-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />
        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!file || state === "processing"}
          onClick={handleCompress}
          type="button"
        >
          Comprimir e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
