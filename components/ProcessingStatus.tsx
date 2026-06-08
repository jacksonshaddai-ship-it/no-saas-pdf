export type ProcessingState = "empty" | "selected" | "processing" | "completed" | "error";

const statusCopy: Record<ProcessingState, { title: string; description: string; className: string }> = {
  empty: {
    title: "Aguardando arquivo",
    description: "Selecione um arquivo para preparar esta ferramenta.",
    className: "border-slate-200 bg-white text-slate-600",
  },
  selected: {
    title: "Arquivo selecionado",
    description: "Revise a lista e execute quando estiver pronto.",
    className: "border-cyan-200 bg-cyan-50 text-cyan-800",
  },
  processing: {
    title: "Processando",
    description: "Mantenha esta aba aberta enquanto o documento é preparado.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  completed: {
    title: "Concluído",
    description: "O download foi iniciado ou o resultado está pronto.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  error: {
    title: "Erro",
    description: "Revise o arquivo e tente novamente.",
    className: "border-red-200 bg-red-50 text-red-800",
  },
};

export function ProcessingStatus({
  state,
  message,
}: {
  state: ProcessingState;
  message?: string | null;
}) {
  const copy = statusCopy[state];

  return (
    <div className={`rounded-lg border p-4 ${copy.className}`} role={state === "error" ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
        <div>
          <p className="text-sm font-black">{copy.title}</p>
          <p className="mt-1 text-sm leading-6">{message || copy.description}</p>
        </div>
      </div>
    </div>
  );
}
