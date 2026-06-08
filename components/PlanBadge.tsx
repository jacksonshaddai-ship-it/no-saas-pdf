import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { PLANS } from "@/lib/plans";

const accent: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function PlanBadge({ tool }: { tool: Tool }) {
  const plan = PLANS[tool.minimumPlan];
  return (
    <Link
      href="/pricing"
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black ring-1 transition hover:opacity-80 ${accent[plan.accent]}`}
    >
      <span aria-hidden="true">●</span>
      {tool.badge}
    </Link>
  );
}
