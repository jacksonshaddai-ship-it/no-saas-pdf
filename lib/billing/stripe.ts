// lib/billing/stripe.ts
// Cliente do Stripe usado em runtime.
// Em dev, se STRIPE_API_URL apontar para um mock local, as chamadas
// sao feitas contra o mock. Em prod, usa a API real da Stripe.

import "server-only";
import type { BillingCycle, BillingProvider, Currency, PaidPlanCode } from "./types";
import { BillingError } from "./types";

const STRIPE_API = process.env.STRIPE_API_URL || "https://api.stripe.com";

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new BillingError(
      "STRIPE_NOT_CONFIGURED",
      "Stripe nao configurado. Defina STRIPE_SECRET_KEY.",
      503,
      ["STRIPE_SECRET_KEY"],
    );
  }
  return key;
}

export function isStripeConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  return { ok: missing.length === 0, missing };
}

export type StripeSessionInput = {
  userId: string;
  planCode: PaidPlanCode;
  cycle: BillingCycle;
  amount: number; // cents
  currency: Currency;
  successUrl: string;
  cancelUrl: string;
};

export type StripeSessionResult = {
  sessionId: string;
  url: string; // checkoutUrl
};

export async function createStripeCheckoutSession(input: StripeSessionInput): Promise<StripeSessionResult> {
  const key = getSecretKey();

  // Stripe usa form-urlencoded para endpoints como /v1/checkout/sessions
  // O mock aceita JSON tambem, mas o padrao real e form-urlencoded.
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", input.successUrl);
  form.set("cancel_url", input.cancelUrl);
  form.set("customer_reference", input.userId);
  form.set("metadata[userId]", input.userId);
  form.set("metadata[planCode]", input.planCode);
  form.set("metadata[cycle]", input.cycle);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  form.set("line_items[0][price_data][unit_amount]", String(input.amount));
  form.set("line_items[0][price_data][product_data][name]", `PDF Master Pro ${input.planCode} (${input.cycle})`);

  const res = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const message = json?.error?.message || `Stripe respondeu ${res.status}.`;
    throw new BillingError("STRIPE_CHECKOUT_FAILED", message, 502, json);
  }

  return {
    sessionId: String(json.id),
    url: String(json.url),
  };
}

export function getProviderName(): BillingProvider {
  return "stripe";
}
