// lib/billing/provider.ts
// Decide qual provedor usar com base no pais/moeda.

import type { BillingProvider, Country, Currency, PaidPlanCode } from "./types";

const BR_PROVIDER = (process.env.PAYMENT_PROVIDER_BR || "mercado_pago") as BillingProvider;
const GLOBAL_PROVIDER = (process.env.PAYMENT_PROVIDER_GLOBAL || "stripe") as BillingProvider;

export function getBillingProvider(country: Country, currency: Currency): BillingProvider {
  if (country === "BR" || currency === "BRL") return BR_PROVIDER;
  return GLOBAL_PROVIDER;
}

export function isPaidPlan(code: string | null | undefined): code is PaidPlanCode {
  return code === "PLUS" || code === "PREMIUM" || code === "ENTERPRISE";
}

export function getAppUrl(): string {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}
