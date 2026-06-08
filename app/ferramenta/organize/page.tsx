"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const tool = getToolById("organize")!;

function parseRange(input: string, total: number): number[] {
  const cleaned = input.trim();
  if (!cleaned) throw new Error("Informe ao menos uma página ou intervalo.");

  const indices: number[] = [];
  const parts = cleaned.split(",").map((segment) => segment.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) {
      throw new Error(`Trecho inválido: "${part}". Use formatos como 3 ou 1-5.`);
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (start < 1 || end < 1 || start > total || end > total) {
      throw new Error(`Fora do intervalo (1-${total}): "${part}".`);
    }

    if (start <= end) {
      for (let page = start; page <= end; page += 1) indices.push(page - 1);
    } else {
      for (let page = start; page >= end; page -= 1) indices.push(page - 1);
    }
  }

  return indices;
}

export default function OrganizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [order, setOrder] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [state, setState] = useState<ProcessingState>("empty");
  const [message, setMessage] = useState<string | null>(null);
  const file = files[0] ?? null;

  async function updateFiles(nextFiles: File[]) {
    const trimmed = nextFiles.slice(0, 1);
    setFiles(trimmed);
    setMessage(null);
    setTotalPages(null);
    setOrder("");
    setState(trimmed.length > 0 ? "selected" : "empty");

    const selected = trimmed[0];
    if (selected) {
      try {
        const doc = await PDFDocument.load(await selected.arrayBuffer());
        const count = doc.getPageCount();
        setTotalPages(count);
        setOrder(count > 0 ? `1-${count}` : "");
      } catch {
        setMessage("Não foi possível ler este PDF. Pode estar protegido ou corrompido.");
        setState("error");
      }
    }
  }

  function removeFile() {
    void updateFiles([]);
  }

  async function handleOrganize() {
    try {
      assertPdf(file);
      setState("processing");
      setMessage("Reorganizando o documento.");

      const sourcePdf = await PDFDocument.load(await file.arrayBuffer());
      const total = sourcePdf.getPageCount();
      const indices = parseRange(order, total);

      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(sourcePdf, indices);
      copied.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, `organizado_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage(`PDF reorganizado com ${indices.length} página(s).`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao reorganizar PDF.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="organize-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              Nova ordem das páginas {totalPages ? `(1 a ${totalPages})` : ""}
            </span>
            <input
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setOrder(event.target.value)}
              placeholder="Ex: 3,1,2,4 ou 1-3,5,7-10"
              type="text"
              value={order}
            />
          </label>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Separe páginas por vírgula. Use traço para intervalos. Repita números para duplicar páginas. Use intervalo invertido (ex: 5-1) para inverter trecho.
          </p>
        </div>

        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!file || !order.trim() || state === "processing"}
          onClick={handleOrganize}
          type="button"
        >
          Reorganizar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
