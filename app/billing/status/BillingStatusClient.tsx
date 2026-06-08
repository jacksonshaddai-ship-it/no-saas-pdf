"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Payment = {
  id: string;
  provider: string;
  status: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  createdAt: string;
};

type Status = {
  planCode: string;
  subscription: {
    id: string;
    planCode: string;
    status: string;
    provider: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    canceledAt: string | null;
  } | null;
  payments: Payment[];
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  FREE: { label: "Sem assinatura paga", tone: "bg-slate-100 text-slate-700" },
  PENDING_PAYMENT: { label: "Pagamento pendente", tone: "bg-amber-100 text-amber-700" },
  ACTIVE: { label: "Ativa", tone: "bg-emerald-100 text-emerald-700" },
  PAST_DUE: { label: "Pagamento atrasado", tone: "bg-red-100 text-red-700" },
  CANCELED: { label: "Cancelada", tone: "bg-slate-200 text-slate-700" },
  EXPIRED: { label: "Expirada", tone: "bg-red-100 text-red-700" },
  pending: { label: "Pendente", tone: "bg-amber-100 text-amber-700" },
  approved: { label: "Aprovado", tone: "bg-emerald-100 text-emerald-700" },
  paid: { label: "Pago", tone: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Falhou", tone: "bg-red-100 text-red-700" },
  canceled: { label: "Cancelado", tone: "bg-slate-200 text-slate-700" },
  refunded: { label: "Reembolsado", tone: "bg-slate-200 text-slate-700" },
};

export function BillingStatusClient({
  initial,
  queryStatus,
  queryPaymentId,
}: {
  initial: Status | null;
  queryStatus?: string;
  queryPaymentId?: string;
}) {
  const [data, setData] = useState<Status | null>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/status", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.message || "Falha ao atualizar.");
      } else {
        setData(j);
      }
    } catch {
      setError("Falha de rede.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (queryStatus === "success" || queryStatus === "pending" || queryStatus === "failure") {
      // Sincroniza com o webhook em background.
      const t = setTimeout(refresh, 1500);
      return () => clearTimeout(t);
    }
  }, [queryStatus]);

  if (!data) {
    return <p className="mt-4 text-slate-600">Não foi possível carregar o status.</p>;
  }

  const subStatus = STATUS_LABEL[data.subscription?.status || "FREE"] || STATUS_LABEL.FREE;
  const planLabel = data.subscription?.planCode || data.planCode;

  return (
    <div className="mt-6 space-y-6">
      {queryStatus === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Pagamento recebido. Verificando confirmação do provedor…
        </div>
      )}
      {queryStatus === "pending" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Pagamento em análise. Seu plano será ativado assim que o provedor confirmar.
        </div>
      )}
      {queryStatus === "failure" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          O pagamento não foi aprovado. Você pode tentar novamente.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Plano atual</h2>
            <p className="mt-1 text-sm text-slate-600">Plano: <strong>{planLabel}</strong></p>
            {data.subscription?.currentPeriodEnd && (
              <p className="text-xs text-slate-500">
                Próxima renovação: {new Date(data.subscription.currentPeriodEnd).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${subStatus.tone}`}>
            {subStatus.label}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            href="/pricing"
          >
            Ver planos
          </Link>
          <button
            className={`inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 ${refreshing ? "cursor-wait opacity-60" : ""}`}
            onClick={refresh}
            type="button"
            disabled={refreshing}
          >
            {refreshing ? "Verificando…" : "Já paguei, verificar status"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-black">Pagamentos recentes</h3>
        {data.payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {data.payments.map((p) => {
              const tone = STATUS_LABEL[p.status]?.tone || "bg-slate-100 text-slate-700";
              const label = STATUS_LABEL[p.status]?.label || p.status;
              const amt = (p.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: p.currency });
              return (
                <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-bold">{p.planCode} · {p.billingCycle}</p>
                    <p className="text-xs text-slate-500">
                      {p.provider} · {new Date(p.createdAt).toLocaleString("pt-BR")} · {amt}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${tone}`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
