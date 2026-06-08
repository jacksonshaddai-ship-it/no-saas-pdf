import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { getUserUsageStatus, resolvePlanCode, type UserPlanCode } from "@/lib/usage-user";

export const dynamic = "force-dynamic";

function startOfMonthUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function startOfNextMonthUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

const PLAN_LABEL: Record<UserPlanCode, string> = {
  FREE: "Conta grátis",
  PLUS: "Plus",
  PREMIUM: "Premium",
  ENTERPRISE: "Empresarial",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Faccount");
  }

  const userId = session.user.id;
  const planCode = resolvePlanCode(session.user.planCode);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, planCode: true, createdAt: true },
  });

  const usage = await getUserUsageStatus(userId, planCode);
  const plan = PLANS[planCode === "ENTERPRISE" ? "ENTERPRISE" : planCode === "PREMIUM" ? "PREMIUM" : planCode === "PLUS" ? "PLUS" : "FREE"];

  const now = new Date();
  const monthStart = startOfMonthUtc(now);
  const nextMonth = startOfNextMonthUtc(now);

  const recentLogs = await prisma.usageLog.findMany({
    where: {
      userId,
      createdAt: { gte: monthStart, lt: nextMonth },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, tool: true, sizeBytes: true, success: true, createdAt: true },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-slate-800">
      <header className="mb-8">
        <p className="text-sm font-black uppercase tracking-widest text-red-600">Conta</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Olá, {user?.name ?? "usuário"}!</h1>
        <p className="mt-2 text-sm text-slate-600">
          Plano atual:{" "}
          <strong className="font-black text-slate-900">{PLAN_LABEL[planCode]}</strong> ·{" "}
          <span>{user?.email}</span>
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tarefas hoje</p>
          <p className="mt-2 text-3xl font-black">
            {usage.dailyUsed}
            <span className="ml-1 text-base font-semibold text-slate-500">/ {usage.dailyLimit}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Renova à meia-noite UTC</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tarefas no mês</p>
          <p className="mt-2 text-3xl font-black">
            {usage.monthlyUsed}
            <span className="ml-1 text-base font-semibold text-slate-500">/ {usage.monthlyLimit}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Renova no dia 1º de cada mês</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tamanho máximo</p>
          <p className="mt-2 text-3xl font-black">
            {usage.maxFileMb}
            <span className="ml-1 text-base font-semibold text-slate-500">MB</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Ferramentas de nuvem</p>
        </div>
      </section>

      {planCode === "FREE" && (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-black">Você está no plano Conta grátis.</p>
          <p className="mt-1 text-emerald-800">
            Os planos Plus, Premium e Empresarial liberam ferramentas Plus e Premium, arquivos maiores e mais
            créditos de nuvem. <Link className="font-black underline" href="/pricing">Ver planos</Link>.
          </p>
        </section>
      )}

      <section className="mt-8 flex flex-wrap gap-3">
        <Link
          className="inline-flex items-center rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          href="/"
        >
          Ver ferramentas
        </Link>
        <Link
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          href="/pricing"
        >
          Ver planos
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black">Últimas operações neste mês</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {recentLogs.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Nenhuma operação registrada ainda neste mês.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Ferramenta</th>
                  <th className="px-4 py-2 text-left">Tamanho</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Quando</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr className="border-t border-slate-100" key={log.id}>
                    <td className="px-4 py-2 font-black">{log.tool}</td>
                    <td className="px-4 py-2 text-slate-600">{(log.sizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-black ${
                          log.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.success ? "OK" : "Falhou"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {log.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
