import type { ToolStatus } from "@/lib/tools";

const labels: Record<ToolStatus, string> = {
  local: "Local",
  api: "API",
  soon: "Em breve",
};

const classes: Record<ToolStatus, string> = {
  local: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  api: "bg-amber-50 text-amber-700 ring-amber-200",
  soon: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatusBadge({ status }: { status: ToolStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ring-1 ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}
