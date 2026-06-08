"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, formatBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("sign")!;

const POSITIONS = [
  { id: "bottom-right", label: "Inferior direita" },
  { id: "bottom-center", label: "Inferior centro" },
  { id: "bottom-left", label: "Inferior esquerda" },
  { id: "top-right", label: "Superior direita" },
  { id: "top-center", label: "Superior centro" },
  { id: "top-left", label: "Superior esquerda" },
] as const;

type PositionId = (typeof POSITIONS)[number]["id"];

const PAGE_TARGETS = [
  { id: "last", label: "Apenas última página" },
  { id: "first", label: "Apenas primeira página" },
  { id: "all", label: "Todas as páginas" },
  { id: "custom", label: "Página específica" },
] as const;

type TargetId = (typeof PAGE_TARGETS)[number]["id"];

export default function SignPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [position, setPosition] = useState<PositionId>("bottom-right");
  const [target, setTarget] = useState<TargetId>("last");
  const [customPage, setCustomPage] = useState(1);
  const [scalePercent, setScalePercent] = useState(25);
  const [margin, setMargin] = useState(36);
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

  function resolveTargets(total: number): number[] {
    if (target === "all") return Array.from({ length: total }, (_, index) => index);
    if (target === "first") return [0];
    if (target === "last") return [total - 1];
    const page = Math.max(1, Math.min(total, customPage));
    return [page - 1];
  }

  async function handleSign() {
    try {
      assertPdf(file);
      if (!signatureFile) throw new Error("Envie uma imagem de assinatura (PNG ou JPG).");

      const sigName = signatureFile.name.toLowerCase();
      const isPng = signatureFile.type === "image/png" || sigName.endsWith(".png");
      const isJpg = signatureFile.type === "image/jpeg" || sigName.endsWith(".jpg") || sigName.endsWith(".jpeg");
      if (!isPng && !isJpg) throw new Error("Assinatura precisa ser PNG ou JPG.");

      setState("processing");
      setMessage("Aplicando assinatura no documento.");

      const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
      const sigBytes = new Uint8Array(await signatureFile.arrayBuffer());
      const signature = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);

      const pages = pdfDoc.getPages();
      const targets = resolveTargets(pages.length);

      const scale = Math.max(5, Math.min(80, scalePercent)) / 100;

      for (const pageIndex of targets) {
        const page = pages[pageIndex];
        if (!page) continue;
        const { width, height } = page.getSize();
        const drawWidth = width * scale;
        const drawHeight = (signature.height / signature.width) * drawWidth;

        let x = margin;
        let y = margin;

        if (position.endsWith("center")) {
          x = (width - drawWidth) / 2;
        } else if (position.endsWith("right")) {
          x = width - margin - drawWidth;
        }

        if (position.startsWith("top")) {
          y = height - margin - drawHeight;
        }

        page.drawImage(signature, { x, y, width: drawWidth, height: drawHeight });
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, `assinado_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage(`Assinatura aplicada em ${targets.length} página(s). ${formatBytes(pdfBytes.byteLength)}.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao assinar PDF.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="sign-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />

        <label className="block rounded-lg border border-slate-200 bg-white p-5">
          <span className="mb-2 block text-sm font-black text-slate-700">Imagem da assinatura (PNG com fundo transparente é ideal)</span>
          <input
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className="block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:py-3 file:text-sm file:font-black file:text-white hover:file:bg-red-700"
            onChange={(event) => setSignatureFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          {signatureFile && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {signatureFile.name} · {formatBytes(signatureFile.size)}
            </p>
          )}
        </label>

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
            <span className="mb-2 block text-sm font-black text-slate-700">Onde aplicar</span>
            <select
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setTarget(event.target.value as TargetId)}
              value={target}
            >
              {PAGE_TARGETS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {target === "custom" && (
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Número da página</span>
              <input
                className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                min={1}
                onChange={(event) => setCustomPage(Math.max(1, Number(event.target.value || 1)))}
                type="number"
                value={customPage}
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">Tamanho (% da largura)</span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              max={80}
              min={5}
              onChange={(event) => setScalePercent(Math.max(5, Math.min(80, Number(event.target.value || 25))))}
              type="number"
              value={scalePercent}
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
          disabled={!file || !signatureFile || state === "processing"}
          onClick={handleSign}
          type="button"
        >
          Assinar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
