"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("page-numbers")!;

const POSITIONS = [
  { id: "footer-center", label: "Rodapé centro" },
  { id: "footer-right", label: "Rodapé direita" },
  { id: "footer-left", label: "Rodapé esquerda" },
  { id: "header-center", label: "Cabeçalho centro" },
  { id: "header-right", label: "Cabeçalho direita" },
  { id: "header-left", label: "Cabeçalho esquerda" },
] as const;

type PositionId = (typeof POSITIONS)[number]["id"];

const FORMATS = [
  { id: "simple", label: "1, 2, 3...", template: (n: number) => `${n}` },
  { id: "slash", label: "1 / N", template: (n: number, total: number) => `${n} / ${total}` },
  { id: "page", label: "Página 1 de N", template: (n: number, total: number) => `Página ${n} de ${total}` },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

export default function PageNumbersPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [position, setPosition] = useState<PositionId>("footer-center");
  const [format, setFormat] = useState<FormatId>("simple");
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(11);
  const [margin, setMargin] = useState(24);
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

  async function handleNumber() {
    try {
      assertPdf(file);
      setState("processing");
      setMessage("Aplicando numeração nas páginas.");

      const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const formatDef = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
      const pages = pdfDoc.getPages();
      const total = pages.length;

      pages.forEach((page, index) => {
        const label = formatDef.template(startNumber + index, startNumber + total - 1);
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        let x = margin;
        let y = margin;

        if (position.endsWith("center")) {
          x = (width - textWidth) / 2;
        } else if (position.endsWith("right")) {
          x = width - margin - textWidth;
        }

        if (position.startsWith("header")) {
          y = height - margin - textHeight;
        }

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      });

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, `numerado_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage(`Numeração aplicada em ${total} página(s).`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao numerar páginas.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="page-numbers-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Posição</span>
            <select
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setPosition(event.target.value as PositionId)}
              value={position}
            >
              {POSITIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Formato</span>
            <select
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setFormat(event.target.value as FormatId)}
              value={format}
            >
              {FORMATS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Número inicial</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              min={1}
              onChange={(event) => setStartNumber(Math.max(1, Number(event.target.value || 1)))}
              type="number"
              value={startNumber}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Tamanho da fonte</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              max={48}
              min={6}
              onChange={(event) => setFontSize(Math.max(6, Number(event.target.value || 11)))}
              type="number"
              value={fontSize}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-700">Margem (pontos)</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
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
          disabled={!file || state === "processing"}
          onClick={handleNumber}
          type="button"
        >
          Numerar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
