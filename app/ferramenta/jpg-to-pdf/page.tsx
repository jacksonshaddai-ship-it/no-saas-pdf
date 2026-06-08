"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { downloadBytes, formatBytes } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("jpg-to-pdf")!;

const PAGE_SIZES = {
  fit: { label: "Ajustar à imagem", value: null },
  a4: { label: "A4 (595 x 842 pt)", value: [595.28, 841.89] as const },
  letter: { label: "Carta (612 x 792 pt)", value: [612, 792] as const },
};

type PageSizeKey = keyof typeof PAGE_SIZES;

export default function JpgToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeKey>("fit");
  const [margin, setMargin] = useState(24);
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

  function assertImage(file: File) {
    const name = file.name.toLowerCase();
    const isJpg = file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
    const isPng = file.type === "image/png" || name.endsWith(".png");
    if (!isJpg && !isPng) {
      throw new Error(`Formato não suportado: ${file.name}. Use JPG ou PNG.`);
    }
    return isPng ? "png" : "jpg";
  }

  async function handleConvert() {
    try {
      if (files.length === 0) throw new Error("Selecione ao menos uma imagem.");

      setState("processing");
      setMessage("Construindo o PDF a partir das imagens.");

      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        const kind = assertImage(file);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const image = kind === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

        const sizeConfig = PAGE_SIZES[pageSize].value;
        if (sizeConfig) {
          const [pageWidth, pageHeight] = sizeConfig;
          const usableWidth = pageWidth - margin * 2;
          const usableHeight = pageHeight - margin * 2;
          const scale = Math.min(usableWidth / image.width, usableHeight / image.height, 1);
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          page.drawImage(image, {
            x: (pageWidth - drawWidth) / 2,
            y: (pageHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          });
        } else {
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, "imagens.pdf");
      setState("completed");
      setMessage(`PDF gerado com ${files.length} imagem(ns). ${formatBytes(pdfBytes.byteLength)}.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao converter imagens em PDF.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone
          accept={tool.accept}
          buttonLabel="Selecionar imagens"
          files={files}
          id="jpg-to-pdf-files"
          multiple
          onFilesChange={updateFiles}
          onRemove={removeFile}
          state={state}
        />

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Tamanho da página</span>
            <select
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setPageSize(event.target.value as PageSizeKey)}
              value={pageSize}
            >
              {Object.entries(PAGE_SIZES).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Margem (pontos)</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
              disabled={pageSize === "fit"}
              min={0}
              onChange={(event) => setMargin(Math.max(0, Number(event.target.value || 0)))}
              type="number"
              value={margin}
            />
          </label>
        </div>

        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={files.length === 0 || state === "processing"}
          onClick={handleConvert}
          type="button"
        >
          Gerar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
