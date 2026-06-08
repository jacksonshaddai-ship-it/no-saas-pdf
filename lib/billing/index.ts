// lib/billing/index.ts
// API publica do modulo de billing.
// createCheckout, activateSubscription, markPayment*, getBillingStatus.

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  BillingError,
  type BillingCycle,
  type BillingProvider,
  type CheckoutRequest,
  type CheckoutResult,
  type Country,
  type Currency,
  type PaidPlanCode,
  type PaymentStatus,
  type SubscriptionStatus,
} from "./types";
import { getBillingProvider, getAppUrl, isPaidPlan } from "./provider";
import { getPaidPlanPrice } from "./plans";
import { createMpPreference, isMercadoPagoConfigured } from "./mercado-pago";
import { createStripeCheckoutSession, isStripeConfigured } from "./stripe";

export * from "./types";
export * from "./plans";
export { getBillingProvider, isPaidPlan, getAppUrl } from "./provider";
export { isMercadoPagoConfigured } from "./mercado-pago";
export { isStripeConfigured } from "./stripe";

// ---------------------------------------------------------------------------
// 1) createCheckout
//    FREE -> cria Payment(pending) + Subscription(PENDING_PAYMENT) e chama o
//    provedor. NUNCA ativa o plano aqui. A ativacao vem do webhook.
// ---------------------------------------------------------------------------

export async function createCheckout(args: {
  userId: string;
  planCode: PaidPlanCode;
  billingCycle: BillingCycle;
  country: Country;
  currency: Currency;
}): Promise<CheckoutResult> {
  if (args.planCode === "ENTERPRISE") {
    throw new BillingError(
      "ENTERPRISE_CONTACT_ONLY",
      "Plano Enterprise e sob consulta. Use /contact-sales.",
      400,
    );
  }

  const provider = getBillingProvider(args.country, args.currency);
  const price = getPaidPlanPrice(args.planCode, args.currency, args.billingCycle);
  if (price.amount <= 0) {
    throw new BillingError("INVALID_PRICE", `Preco invalido para ${args.planCode} ${args.billingCycle} ${args.currency}.`, 500);
  }

  // Garante que o provedor escolhido esta configurado.
  if (provider === "mercado_pago" && !isMercadoPagoConfigured().ok) {
    throw new BillingError(
      "MP_NOT_CONFIGURED",
      "Mercado Pago nao configurado. Defina MERCADO_PAGO_ACCESS_TOKEN.",
      503,
      ["MERCADO_PAGO_ACCESS_TOKEN"],
    );
  }
  if (provider === "stripe" && !isStripeConfigured().ok) {
    throw new BillingError(
      "STRIPE_NOT_CONFIGURED",
      "Stripe nao configurado. Defina STRIPE_SECRET_KEY.",
      503,
      ["STRIPE_SECRET_KEY"],
    );
  }

  const appUrl = getAppUrl();
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new BillingError("USER_NOT_FOUND", "Usuario nao encontrado.", 404);

  // Cria (ou recupera) Subscription em estado PENDING_PAYMENT.
  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planCode: args.planCode,
      status: "PENDING_PAYMENT",
      provider,
    },
    update: {
      planCode: args.planCode,
      status: "PENDING_PAYMENT",
      provider,
    },
  });

  // Cria Payment(pending) ANTES de chamar o provedor, para que o webhook
  // consiga correlacionar o evento de volta ao nosso registro.
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      provider,
      amount: price.amount,
      currency: price.currency,
      status: "pending",
      planCode: args.planCode,
      billingCycle: args.billingCycle,
    },
  });

  const notificationUrl = `${appUrl}/api/webhooks/mercado-pago`;
  const successUrl = `${appUrl}/billing/status?payment=${payment.id}&status=success`;
  const failureUrl = `${appUrl}/billing/status?payment=${payment.id}&status=failure`;
  const pendingUrl = `${appUrl}/billing/status?payment=${payment.id}&status=pending`;

  let checkoutId = "";
  let checkoutUrl = "";

  try {
    if (provider === "mercado_pago") {
      const pref = await createMpPreference({
        userId: user.id,
        planCode: args.planCode,
        cycle: args.billingCycle,
        amount: price.amount,
        currency: price.currency,
        successUrl,
        failureUrl,
        pendingUrl,
        notificationUrl,
      });
      checkoutId = pref.preferenceId;
      checkoutUrl = pref.initPoint;
    } else {
      const session = await createStripeCheckoutSession({
        userId: user.id,
        planCode: args.planCode,
        cycle: args.billingCycle,
        amount: price.amount,
        currency: price.currency,
        successUrl,
        cancelUrl: failureUrl,
      });
      checkoutId = session.sessionId;
      checkoutUrl = session.url;
    }
  } catch (err) {
    // Em caso de erro no provedor, marca o pagamento como failed para rastreio.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    throw err;
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerCheckoutId: checkoutId,
      checkoutUrl,
    },
  });

  return {
    paymentId: updated.id,
    checkoutId,
    checkoutUrl,
    provider,
  };
}

// ---------------------------------------------------------------------------
// 2) activateSubscription
//    Chamado SOMENTE pelo webhook apos confirmacao de pagamento.
//    Atualiza User.planCode + Subscription.status + currentPeriodStart/End.
// ---------------------------------------------------------------------------

export async function activateSubscription(args: {
  userId: string;
  planCode: PaidPlanCode;
  provider: BillingProvider;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { userId: args.userId },
      create: {
        userId: args.userId,
        planCode: args.planCode,
        status: "ACTIVE",
        provider: args.provider,
        providerCustomerId: args.providerCustomerId || undefined,
        providerSubscriptionId: args.providerSubscriptionId || undefined,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
      },
      update: {
        planCode: args.planCode,
        status: "ACTIVE",
        provider: args.provider,
        providerCustomerId: args.providerCustomerId || undefined,
        providerSubscriptionId: args.providerSubscriptionId || undefined,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        canceledAt: null,
      },
    });
    // Regra chave: User.planCode so muda via webhook.
    await tx.user.update({
      where: { id: args.userId },
      data: { planCode: args.planCode === "ENTERPRISE" ? "PREMIUM" : args.planCode },
    });
  });
}

// ---------------------------------------------------------------------------
// 3) markPaymentStatus
// ---------------------------------------------------------------------------

export async function markPayment(args: {
  paymentId: string;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  paymentMethod?: string | null;
  rawEvent?: unknown;
}): Promise<void> {
  const safeRaw = args.rawEvent ? safeStringify(args.rawEvent) : undefined;
  await prisma.payment.update({
    where: { id: args.paymentId },
    data: {
      status: args.status,
      providerPaymentId: args.providerPaymentId || undefined,
      paymentMethod: args.paymentMethod || undefined,
      rawEvent: safeRaw,
    },
  });
}

export async function markSubscriptionPastDue(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: { status: "PAST_DUE" },
  });
}

export async function cancelSubscriptionByUserId(args: {
  userId: string;
  reason?: "user" | "expired" | "payment_failed";
}): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { userId: args.userId } });
  if (!sub) return;
  const newStatus: SubscriptionStatus = args.reason === "expired" ? "EXPIRED" : "CANCELED";
  await prisma.subscription.update({
    where: { userId: args.userId },
    data: { status: newStatus, canceledAt: new Date() },
  });
  // Se cancelou/ expirou, volta para FREE.
  await prisma.user.update({
    where: { id: args.userId },
    data: { planCode: "FREE" },
  });
}

// ---------------------------------------------------------------------------
// 4) getBillingStatus
// ---------------------------------------------------------------------------

export async function getBillingStatus(userId: string) {
  const [user, subscription, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, planCode: true },
    }),
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) throw new BillingError("USER_NOT_FOUND", "Usuario nao encontrado.", 404);

  return {
    planCode: user.planCode,
    subscription: subscription
      ? {
          id: subscription.id,
          planCode: subscription.planCode,
          status: subscription.status,
          provider: subscription.provider,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          canceledAt: subscription.canceledAt,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      planCode: p.planCode,
      billingCycle: p.billingCycle,
      amount: p.amount,
      currency: p.currency,
      checkoutUrl: p.checkoutUrl,
      createdAt: p.createdAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (v === undefined ? null : v), 2);
  } catch {
    return "[unserializable]";
  }
}
