"use client";

import { UploadDropzone } from "./UploadDropzone";

export function FilePicker({
  id,
  multiple = false,
  accept = ".pdf,application/pdf",
  files,
  onFiles,
  label = "Selecionar arquivo PDF",
  helper = "ou solte o arquivo aqui",
}: {
  id: string;
  multiple?: boolean;
  accept?: string;
  files: File[];
  onFiles: (files: File[]) => void;
  label?: string;
  helper?: string;
}) {
  return (
    <UploadDropzone
      accept={accept}
      buttonLabel={label}
      files={files}
      helperText={helper}
      id={id}
      multiple={multiple}
      onFilesChange={onFiles}
      onRemove={(index) => onFiles(files.filter((_, currentIndex) => currentIndex !== index))}
      state={files.length > 0 ? "selected" : "empty"}
    />
  );
}
