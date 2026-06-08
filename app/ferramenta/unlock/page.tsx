"use client";

import { useState } from "react";
import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolById } from "@/lib/tools";

const tool = getToolById("unlock")!;

export default function UnlockPage() {
  const [password, setPassword] = useState("");

  return (
    <ToolPageLayout tool={tool}>
      <ApiToolWorkspace
        tool={tool}
        buttonLabel="Desbloquear e baixar PDF"
        helperNotice={
          <>
            Use apenas com PDFs cujos donos autorizaram o desbloqueio. Necessita
            <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">CLOUDCONVERT_API_KEY</code>
            configurada. O upload vai direto do navegador para o CloudConvert.
          </>
        }
        isReady={(file) => Boolean(file) && password.length > 0}
        buildOptions={() => ({ password })}
        extraFields={
          <label className="block rounded-lg border border-slate-200 bg-white p-5">
            <span className="mb-2 block text-sm font-black text-slate-700">Senha atual do PDF</span>
            <input
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite a senha do arquivo"
              type="password"
              value={password}
            />
          </label>
        }
      />
    </ToolPageLayout>
  );
}
