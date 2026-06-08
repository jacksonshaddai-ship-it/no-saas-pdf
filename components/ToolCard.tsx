import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { PlanBadge } from "./PlanBadge";
import { StatusBadge } from "./StatusBadge";
import { ToolIcon } from "./ToolIcon";

const accentClasses: Record<Tool["accent"], string> = {
  red: "bg-red-50 text-red-700 ring-red-100 group-hover:bg-red-600 group-hover:text-white",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 group-hover:bg-amber-500 group-hover:text-white",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100 group-hover:bg-cyan-600 group-hover:text-white",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100 group-hover:bg-indigo-600 group-hover:text-white",
  violet: "bg-violet-50 text-violet-700 ring-violet-100 group-hover:bg-violet-600 group-hover:text-white",
  slate: "bg-slate-100 text-slate-700 ring-slate-200 group-hover:bg-slate-950 group-hover:text-white",
};

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      className="group relative flex min-h-48 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-100"
      href={tool.href}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-lg ring-1 transition ${accentClasses[tool.accent]}`}
        >
          <ToolIcon className="h-5 w-5" icon={tool.icon} />
        </span>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={tool.status} />
          <PlanBadge tool={tool} />
        </div>
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-950">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{tool.shortDescription}</p>
      <span className="mt-5 inline-flex items-center text-sm font-bold text-red-700">
        Abrir ferramenta
        <span aria-hidden="true" className="ml-2 transition group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
