// lib/billing/plans.ts
// Precos publicos de Plus e Premium, sincronizados com lib/plans.ts.
// Estes valores sao usados na hora de criar checkout no provedor.

import type { BillingCycle, Currency, PaidPlanCode } from "./types";

export type PaidPlanPrice = {
  planCode: PaidPlanCode;
  amount: number; // em centavos (BRL/USD tem 2 casas)
  currency: Currency;
  cycle: BillingCycle;
};

const PRICES: Record<PaidPlanCode, Record<Currency, Record<BillingCycle, number>>> = {
  PLUS: {
    BRL: { monthly: 1490, yearly: 8990 },  // R$ 14,90 / R$ 89,90
    USD: { monthly: 299,  yearly: 1799 },  // US$ 2,99 / US$ 17,99
  },
  PREMIUM: {
    BRL: { monthly: 2490, yearly: 14990 }, // R$ 24,90 / R$ 149,90
    USD: { monthly: 499,  yearly: 2999 },  // US$ 4,99 / US$ 29,99
  },
  // ENTERPRISE: sob consulta, nao tem preco publico.
  ENTERPRISE: {
    BRL: { monthly: 0, yearly: 0 },
    USD: { monthly: 0, yearly: 0 },
  },
};

export function getPaidPlanPrice(
  planCode: PaidPlanCode,
  currency: Currency,
  cycle: BillingCycle,
): PaidPlanPrice {
  const amount = PRICES[planCode][currency][cycle];
  return { planCode, amount, currency, cycle };
}

export function formatPrice(amountInCents: number, currency: Currency): string {
  const value = (amountInCents / 100).toFixed(2);
  if (currency === "BRL") return `R$ ${value.replace(".", ",")}`;
  return `US$ ${value}`;
}

export function yearlySavingsPercent(
  planCode: PaidPlanCode,
  currency: Currency,
): number {
  const monthly = PRICES[planCode][currency].monthly;
  const yearly = PRICES[planCode][currency].yearly;
  if (!monthly || !yearly) return 0;
  const fullYear = monthly * 12;
  return Math.round(((fullYear - yearly) / fullYear) * 100);
}
