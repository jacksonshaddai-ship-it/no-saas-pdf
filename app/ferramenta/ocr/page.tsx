"use client";

import { useState } from "react";
import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolById } from "@/lib/tools";

const tool = getToolById("ocr")!;

const LANGUAGES = [
  { value: "por", label: "Português" },
  { value: "eng", label: "Inglês" },
  { value: "spa", label: "Espanhol" },
  { value: "fra", label: "Francês" },
  { value: "deu", label: "Alemão" },
  { value: "ita", label: "Italiano" },
];

export default function OcrPage() {
  const [language, setLanguage] = useState("por");

  return (
    <ToolPageLayout tool={tool}>
      <ApiToolWorkspace
        tool={tool}
        buttonLabel="Reconhecer texto e baixar PDF"
        outputExtension="pdf"
        helperNotice={
          <>
            OCR via CloudConvert (engine ocrmypdf). Configure
            <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">CLOUDCONVERT_API_KEY</code>
            antes do deploy. O arquivo é enviado direto do navegador para o CloudConvert.
          </>
        }
        buildOptions={() => ({ language })}
        extraFields={
          <label className="block rounded-lg border border-slate-200 bg-white p-5">
            <span className="mb-2 block text-sm font-black text-slate-700">Idioma do documento</span>
            <select
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </ToolPageLayout>
  );
}
