"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("merge")!;

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("empty");
  const [message, setMessage] = useState<string | null>(null);

  function updateFiles(nextFiles: File[]) {
    setFiles(nextFiles);
    setMessage(null);
    setState(nextFiles.length > 0 ? "selected" : "empty");
  }

  function removeFile(index: number) {
    updateFiles(files.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleMerge() {
    try {
      if (files.length < 2) throw new Error("Selecione pelo menos 2 arquivos PDF.");
      files.forEach((file) => assertPdf(file));

      setState("processing");
      setMessage("Juntando os documentos no navegador.");

      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const pdf = await PDFDocument.load(await file.arrayBuffer());
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, "documentos_juntos.pdf");
      setState("completed");
      setMessage(`PDF gerado com ${files.length} arquivos.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao juntar PDFs.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone
          files={files}
          id="merge-files"
          multiple
          onFilesChange={updateFiles}
          onRemove={removeFile}
          state={state}
        />
        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={files.length < 2 || state === "processing"}
          onClick={handleMerge}
          type="button"
        >
          Juntar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
