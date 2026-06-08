"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS, type PlanCode } from "@/lib/plans";

const accent: Record<string, { border: string; bg: string; text: string; badge: string; ring: string }> = {
  slate: { border: "border-slate-200", bg: "bg-white", text: "text-slate-700", badge: "bg-slate-100 text-slate-600", ring: "ring-slate-200" },
  emerald: { border: "border-emerald-500", bg: "bg-white", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
  indigo: { border: "border-indigo-200", bg: "bg-white", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700", ring: "ring-indigo-200" },
  red: { border: "border-red-200", bg: "bg-white", text: "text-red-700", badge: "bg-red-100 text-red-700", ring: "ring-red-200" },
  violet: { border: "border-violet-200", bg: "bg-white", text: "text-violet-200", badge: "bg-violet-100 text-violet-200", ring: "ring-violet-200" },
};

const ORDER: PlanCode[] = ["ANONYMOUS", "FREE", "PLUS", "PREMIUM", "ENTERPRISE"];

const CARD_LABEL: Record<PlanCode, string> = {
  ANONYMOUS: "Básico",
  FREE: "Conta grátis",
  PLUS: "Plus",
  PREMIUM: "Premium",
  ENTERPRISE: "Empresarial",
};

const CARD_DESCRIPTION: Record<PlanCode, string> = {
  ANONYMOUS: "Para experimentar sem cadastro.",
  FREE: "Para uso pessoal, com cadastro rápido.",
  PLUS: "Para quem precisa de mais conversões e ferramentas.",
  PREMIUM: "Para uso intenso e ferramentas avançadas.",
  ENTERPRISE: "Para times, alto volume e contrato dedicado.",
};

type Props = {
  isLoggedIn: boolean;
  currentPlan?: "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE";
  defaultCountry?: "BR" | "GLOBAL";
};

export function PricingClient({ isLoggedIn, currentPlan, defaultCountry = "BR" }: Props) {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [country, setCountry] = useState<"BR" | "GLOBAL">(defaultCountry);
  const [loading, setLoading] = useState<PlanCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(planCode: "PLUS" | "PREMIUM") {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    setError(null);
    setLoading(planCode);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode,
          billingCycle: annual ? "yearly" : "monthly",
          country,
          currency: country === "BR" ? "BRL" : "USD",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        if (json?.error === "MP_NOT_CONFIGURED" || json?.error === "STRIPE_NOT_CONFIGURED") {
          setError("O pagamento ainda não está habilitado no servidor. Tente novamente em instantes.");
        } else {
          setError(json?.message || "Não foi possível iniciar o pagamento.");
        }
        setLoading(null);
        return;
      }
      // Redireciona para o checkout do provedor (em mock ou em prod).
      window.location.href = json.checkoutUrl;
    } catch (e) {
      setError("Falha de rede ao iniciar o pagamento.");
      setLoading(null);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Escolha o plano ideal para você</h1>
          <p className="mt-2 text-base text-slate-600">
            Use as ferramentas de PDF direto no navegador, sem instalar nada.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm font-bold">
            <button
              className={`rounded-full px-4 py-2 transition ${!annual ? "bg-red-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
              onClick={() => setAnnual(false)}
              type="button"
            >
              Mensal
            </button>
            <button
              className={`rounded-full px-4 py-2 transition ${annual ? "bg-red-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
              onClick={() => setAnnual(true)}
              type="button"
            >
              Anual
              <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                Economize
              </span>
            </button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs font-bold">
            <button
              className={`rounded-full px-3 py-1 transition ${country === "BR" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              onClick={() => setCountry("BR")}
              type="button"
              title="Pagamento em reais via Mercado Pago (Pix ou cartão)"
            >
              Brasil (BRL)
            </button>
            <button
              className={`rounded-full px-3 py-1 transition ${country === "GLOBAL" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              onClick={() => setCountry("GLOBAL")}
              type="button"
              title="Pagamento em dólares via Stripe (cartão internacional)"
            >
              Global (USD)
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((code) => {
          const plan = PLANS[code];
          const a = accent[plan.accent];
          const isCurrent = isLoggedIn && (
            (currentPlan === "FREE" && (code === "FREE" || code === "ANONYMOUS")) ||
            (currentPlan === "PLUS" && code === "PLUS") ||
            (currentPlan === "PREMIUM" && code === "PREMIUM") ||
            (currentPlan === "ENTERPRISE" && code === "ENTERPRISE")
          );
          const isPaid = code === "PLUS" || code === "PREMIUM";
          const isEnterprise = code === "ENTERPRISE";

          let price = "Grátis";
          let priceSub = "";
          let priceUnit = "";
          if (isEnterprise) {
            price = "Sob consulta";
          } else if (isPaid && plan.price) {
            const brl = annual ? plan.price.BRL.yearly : plan.price.BRL.monthly;
            const usd = annual ? plan.price.USD.yearly : plan.price.USD.monthly;
            if (country === "BR" && brl != null) {
              price = `R$ ${brl.toFixed(2).replace(".", ",")}`;
              priceUnit = annual ? "/ano" : "/mês";
              priceSub = usd != null ? `ou US$ ${usd.toFixed(2)} ${annual ? "/ano" : "/mês"}` : "";
            } else if (usd != null) {
              price = `US$ ${usd.toFixed(2)}`;
              priceUnit = annual ? "/ano" : "/mês";
              priceSub = brl != null ? `ou R$ ${brl.toFixed(2).replace(".", ",")} ${annual ? "/ano" : "/mês"}` : "";
            } else {
              price = "—";
            }
          }

          return (
            <div
              key={code}
              className={`relative flex flex-col rounded-2xl ${a.bg} p-6 shadow-sm ring-1 ${a.ring} ${plan.highlight ? `border-2 ${a.border}` : `border ${a.border}`}`}
            >
              {plan.highlight && (
                <span className={`absolute -top-3 right-4 rounded-full ${a.badge} px-3 py-1 text-xs font-black uppercase tracking-wider`}>
                  Mais popular
                </span>
              )}
              <h2 className={`text-xl font-black ${a.text}`}>{CARD_LABEL[code]}</h2>
              <p className="mt-1 text-sm text-slate-600">{CARD_DESCRIPTION[code]}</p>
              <p className="mt-4 text-3xl font-black text-slate-950">
                {price}
                {priceUnit && <span className="text-base font-bold text-slate-500"> {priceUnit}</span>}
              </p>
              {priceSub && <p className="mt-1 text-xs text-slate-500">{priceSub}</p>}
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {plan.publicFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className={`mt-0.5 ${a.text}`}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <span className="inline-flex w-full cursor-default items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
                    Seu plano atual
                  </span>
                ) : code === "ANONYMOUS" ? (
                  isLoggedIn ? (
                    <span className="inline-flex w-full cursor-default items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
                      Você já tem conta
                    </span>
                  ) : (
                    <Link
                      className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      href="/"
                    >
                      Comece grátis
                    </Link>
                  )
                ) : code === "FREE" ? (
                  isLoggedIn ? (
                    <Link
                      className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      href="/account"
                    >
                      Ir para minha conta
                    </Link>
                  ) : (
                    <Link
                      className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                      href="/register"
                    >
                      Comece grátis
                    </Link>
                  )
                ) : code === "ENTERPRISE" ? (
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    href="/contact-sales"
                  >
                    Contactar vendas
                  </Link>
                ) : (
                  <button
                    className={`inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-black transition ${
                      loading === code
                        ? "cursor-wait bg-slate-300 text-slate-600"
                        : code === "PLUS"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                    disabled={loading !== null}
                    onClick={() => handleCheckout(code as "PLUS" | "PREMIUM")}
                    type="button"
                  >
                    {loading === code
                      ? "Redirecionando…"
                      : code === "PLUS"
                      ? "Assinar Plus"
                      : "Assinar Premium"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
        <h3 className="text-base font-black text-slate-800">Como funcionam as ferramentas</h3>
        <p className="mt-2">
          As ferramentas <strong>locais</strong> (juntar, dividir, girar, marca d’água, comprimir, organizar, números
          de página, JPG → PDF e assinar) rodam 100% no seu navegador com <code>pdf-lib</code> e
          <strong> não consomem cota em nenhum plano</strong>.
        </p>
        <p className="mt-2">
          As ferramentas <strong>na nuvem</strong> (proteger, desbloquear, PDF ↔ Word, PowerPoint, Excel, JPG,
          OCR, PDF/A, ocultar) usam o CloudConvert. Limites por plano são exibidos no seu painel.
        </p>
        <p className="mt-2">
          A assinatura é confirmada por <strong>webhook</strong> do provedor de pagamento. Após a
          confirmação, o plano é ativado automaticamente e as ferramentas Plus/Premium ficam disponíveis.
        </p>
      </section>
    </>
  );
}
