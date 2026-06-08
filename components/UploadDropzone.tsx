"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { ProcessingState } from "./ProcessingStatus";
import { formatBytes } from "@/lib/browser-file";

export function UploadDropzone({
  id,
  files,
  onFilesChange,
  onRemove,
  accept = ".pdf,application/pdf",
  multiple = false,
  state = "empty",
  disabled = false,
  buttonLabel = "Selecionar arquivo PDF",
  helperText = "ou solte o arquivo aqui",
}: {
  id: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onRemove: (index: number) => void;
  accept?: string;
  multiple?: boolean;
  state?: ProcessingState;
  disabled?: boolean;
  buttonLabel?: string;
  helperText?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function commitFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    const nextFiles = multiple ? [...files, ...incoming] : incoming.slice(0, 1);
    onFilesChange(nextFiles);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    commitFiles(Array.from(event.dataTransfer.files));
  }

  const hasFiles = files.length > 0;
  const activeClass = isDragging ? "border-red-400 bg-red-50" : hasFiles ? "border-cyan-300 bg-cyan-50/40" : "border-slate-300 bg-white";

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-5 text-center transition ${activeClass}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        accept={accept}
        className="sr-only"
        disabled={disabled}
        id={id}
        multiple={multiple}
        onChange={(event) => commitFiles(Array.from(event.target.files ?? []))}
        ref={inputRef}
        type="file"
      />

      <div className="mx-auto flex max-w-xl flex-col items-center py-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white" aria-hidden="true">
          PDF
        </span>
        <label
          className={`mt-5 inline-flex cursor-pointer items-center justify-center rounded-md bg-red-600 px-6 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
          htmlFor={id}
        >
          {buttonLabel}
        </label>
        <p className="mt-3 text-sm font-semibold text-slate-500">{helperText}</p>
      </div>

      {hasFiles && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white text-left">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-black text-slate-950">Arquivos selecionados ({files.length})</p>
          </div>
          <ul className="divide-y divide-slate-200">
            {files.map((file, index) => (
              <li className="flex items-center justify-between gap-3 px-4 py-3" key={`${file.name}-${file.size}-${index}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatBytes(file.size)}</p>
                </div>
                <button
                  className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  disabled={state === "processing"}
                  onClick={() => onRemove(index)}
                  type="button"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
