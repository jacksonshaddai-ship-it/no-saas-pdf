// lib/billing/mercado-pago.ts
// Cliente do Mercado Pago usado em runtime.
// Em dev, se a env MERCADO_PAGO_API_URL apontar para um mock local,
// todas as chamadas sao feitas contra o mock. Em prod, usa a API real.

import "server-only";
import type { BillingCycle, BillingProvider, Currency, PaidPlanCode } from "./types";
import { BillingError } from "./types";

const MP_API = process.env.MERCADO_PAGO_API_URL || "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    throw new BillingError(
      "MP_NOT_CONFIGURED",
      "Mercado Pago nao configurado. Defina MERCADO_PAGO_ACCESS_TOKEN.",
      503,
      ["MERCADO_PAGO_ACCESS_TOKEN"],
    );
  }
  return token;
}

export function isMercadoPagoConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) missing.push("MERCADO_PAGO_ACCESS_TOKEN");
  return { ok: missing.length === 0, missing };
}

export type MpPreferenceInput = {
  userId: string;
  planCode: PaidPlanCode;
  cycle: BillingCycle;
  amount: number; // centavos
  currency: Currency;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
};

export type MpPreferenceResult = {
  preferenceId: string;
  initPoint: string; // checkoutUrl
  sandboxInitPoint: string;
};

export async function createMpPreference(input: MpPreferenceInput): Promise<MpPreferenceResult> {
  const token = getAccessToken();

  const body = {
    items: [
      {
        title: `PDF Master Pro ${input.planCode} (${input.cycle})`,
        quantity: 1,
        unit_price: input.amount / 100,
        currency_id: input.currency,
      },
    ],
    external_reference: input.userId,
    notification_url: input.notificationUrl,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    auto_return: "approved",
    metadata: {
      planCode: input.planCode,
      cycle: input.cycle,
      userId: input.userId,
    },
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok) {
    const message = json?.message || `Mercado Pago respondeu ${res.status}.`;
    throw new BillingError("MP_CHECKOUT_FAILED", message, 502, json);
  }

  return {
    preferenceId: String(json.id),
    initPoint: String(json.init_point),
    sandboxInitPoint: String(json.sandbox_init_point || json.init_point),
  };
}

export function getProviderName(): BillingProvider {
  return "mercado_pago";
}
