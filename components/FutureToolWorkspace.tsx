"use client";

import { useState } from "react";
import type { Tool } from "@/lib/tools";
import { ProcessingStatus, type ProcessingState } from "./ProcessingStatus";
import { UploadDropzone } from "./UploadDropzone";

export function FutureToolWorkspace({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("empty");
  const [message, setMessage] = useState<string | null>(null);

  function updateFiles(nextFiles: File[]) {
    setFiles(nextFiles);
    setMessage(null);
    setState(nextFiles.length > 0 ? "selected" : "empty");
  }

  function removeFile(index: number) {
    const nextFiles = files.filter((_, currentIndex) => currentIndex !== index);
    updateFiles(nextFiles);
  }

  async function handleRun() {
    if (files.length === 0) {
      setState("error");
      setMessage("Selecione um arquivo antes de executar a ferramenta.");
      return;
    }

    setState("processing");
    setMessage("Preparando integração profissional para esta ferramenta.");
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setState("error");
    setMessage("Esta função pesada está preparada para integração futura com CloudConvert, ConvertAPI ou outro provedor.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <UploadDropzone
        accept={tool.accept}
        files={files}
        id={`${tool.id}-upload`}
        multiple={tool.multiple}
        onFilesChange={updateFiles}
        onRemove={removeFile}
        state={state}
      />

      <ProcessingStatus message={message} state={state} />

      <button
        className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={files.length === 0 || state === "processing"}
        onClick={handleRun}
        type="button"
      >
        Executar {tool.name}
      </button>
    </div>
  );
}
