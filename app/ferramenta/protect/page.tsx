"use client";

import { useState } from "react";
import { ApiToolWorkspace } from "@/components/ApiToolWorkspace";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolById } from "@/lib/tools";

const tool = getToolById("protect")!;

export default function ProtectPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordsMatch = password.length > 0 && password === confirm;

  return (
    <ToolPageLayout tool={tool}>
      <ApiToolWorkspace
        tool={tool}
        buttonLabel="Proteger e baixar PDF"
        helperNotice={
          <>
            Esta proteção usa criptografia real via CloudConvert. Configure a variável
            <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">CLOUDCONVERT_API_KEY</code>
            na Vercel antes do deploy. O arquivo é enviado direto do navegador para o CloudConvert.
          </>
        }
        isReady={(file) => Boolean(file) && passwordsMatch && password.length >= 4}
        buildOptions={() => ({ password })}
        extraFields={
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Senha de proteção</span>
              <input
                autoComplete="new-password"
                className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                minLength={4}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 4 caracteres"
                type="password"
                value={password}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Confirmar senha</span>
              <input
                autoComplete="new-password"
                className="w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                minLength={4}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repita a senha"
                type="password"
                value={confirm}
              />
              {!passwordsMatch && confirm.length > 0 && (
                <span className="mt-2 block text-xs font-bold text-red-700">As senhas não coincidem.</span>
              )}
            </label>
          </div>
        }
      />
    </ToolPageLayout>
  );
}
