"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("split")!;

export default function SplitPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
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

  async function handleSplit() {
    try {
      assertPdf(file);
      if (startPage < 1 || endPage < startPage) {
        throw new Error("Verifique o intervalo: a página final precisa ser maior ou igual à inicial.");
      }

      setState("processing");
      setMessage("Extraindo o intervalo selecionado.");

      const sourcePdf = await PDFDocument.load(await file.arrayBuffer());
      const totalPages = sourcePdf.getPageCount();

      if (endPage > totalPages) {
        throw new Error(`Intervalo inválido. Este PDF possui ${totalPages} página(s).`);
      }

      const newPdf = await PDFDocument.create();
      const indices = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage - 1 + index);
      const copiedPages = await newPdf.copyPages(sourcePdf, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, `paginas_${startPage}_a_${endPage}_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage(`Páginas ${startPage} a ${endPage} extraídas com sucesso.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao dividir PDF.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="split-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Página inicial</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              min={1}
              onChange={(event) => setStartPage(Number(event.target.value || 1))}
              type="number"
              value={startPage}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Página final</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              min={1}
              onChange={(event) => setEndPage(Number(event.target.value || 1))}
              type="number"
              value={endPage}
            />
          </label>
        </div>

        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!file || state === "processing"}
          onClick={handleSplit}
          type="button"
        >
          Extrair e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
