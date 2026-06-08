"use client";

import { useState } from "react";
import { degrees, PDFDocument } from "pdf-lib";
import { ProcessingStatus, type ProcessingState } from "@/components/ProcessingStatus";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UploadDropzone } from "@/components/UploadDropzone";
import { assertPdf, downloadBytes, sanitizeFilename } from "@/lib/browser-file";
import { getToolById } from "@/lib/tools";

const options = [90, 180, 270] as const;
type Rotation = (typeof options)[number];

const tool = getToolById("rotate")!;

export default function RotatePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [rotation, setRotation] = useState<Rotation>(90);
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

  async function handleRotate() {
    try {
      assertPdf(file);
      setState("processing");
      setMessage(`Rotacionando todas as páginas em ${rotation} graus.`);

      const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
      pdfDoc.getPages().forEach((page) => {
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + rotation) % 360));
      });

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      downloadBytes(pdfBytes, `rotacionado_${sanitizeFilename(file.name)}`);
      setState("completed");
      setMessage(`Documento rotacionado em ${rotation} graus.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao rotacionar PDF.");
    }
  }

  return (
    <ToolPageLayout tool={tool}>
      <div className="mx-auto max-w-3xl space-y-5">
        <UploadDropzone files={files} id="rotate-file" onFilesChange={updateFiles} onRemove={removeFile} state={state} />

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm font-black text-slate-700">Ângulo de rotação</p>
          <div className="grid grid-cols-3 gap-3">
            {options.map((option) => (
              <button
                className={`rounded-md px-4 py-3 font-black ring-1 transition ${
                  rotation === option ? "bg-red-600 text-white ring-red-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-red-50"
                }`}
                key={option}
                onClick={() => setRotation(option)}
                type="button"
              >
                {option}°
              </button>
            ))}
          </div>
        </div>

        <ProcessingStatus message={message} state={state} />
        <button
          className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!file || state === "processing"}
          onClick={handleRotate}
          type="button"
        >
          Rotacionar e baixar PDF
        </button>
      </div>
    </ToolPageLayout>
  );
}
