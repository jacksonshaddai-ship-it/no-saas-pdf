// lib/billing/types.ts
// Tipos publicos do modulo de billing. Mantem o app e os testes desacoplados
// dos detalhes de cada provedor (Mercado Pago, Stripe, manual).

export type BillingProvider = "mercado_pago" | "stripe" | "manual";

export type PaidPlanCode = "PLUS" | "PREMIUM" | "ENTERPRISE";

export type BillingCycle = "monthly" | "yearly";

export type Currency = "BRL" | "USD";

export type Country = "BR" | "GLOBAL";

export type SubscriptionStatus =
  | "FREE"
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";

export type PaymentStatus =
  | "pending"
  | "approved"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export type CheckoutRequest = {
  planCode: PaidPlanCode;
  billingCycle: BillingCycle;
  country: Country;
  currency: Currency;
};

export type CheckoutResult = {
  paymentId: string;
  checkoutId: string;
  checkoutUrl: string;
  provider: BillingProvider;
};

export type BillingConfig = {
  provider: BillingProvider;
  publicKey?: string;
  isConfigured: boolean;
  missingEnv: string[];
};

export class BillingError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
