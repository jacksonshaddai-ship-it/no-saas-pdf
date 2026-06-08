// app/api/webhooks/stripe/route.ts
// Recebe webhooks do Stripe. Ativa plano SOMENTE com eventos de pagamento confirmado.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  activateSubscription,
  markPayment,
  markSubscriptionPastDue,
  cancelSubscriptionByUserId,
  type PaidPlanCode,
} from "@/lib/billing";
import { verifyStripeSignature } from "@/lib/billing/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKIP_SIG = process.env.BILLING_SKIP_WEBHOOK_SIG === "1";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (secret && !SKIP_SIG) {
    const ok = verifyStripeSignature({
      rawHeader: request.headers.get("stripe-signature"),
      rawBody,
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
    }
  }

  let event: any = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const type = String(event?.type || "");
  const dataObject = event?.data?.object || {};

  switch (type) {
    case "checkout.session.completed": {
      // Pagamento do Checkout Session foi concluido.
      const userId = String(dataObject?.metadata?.userId || dataObject?.client_reference_id || "");
      const planCode = String(dataObject?.metadata?.planCode || "PREMIUM") as PaidPlanCode;
      const cycle = String(dataObject?.metadata?.cycle || "monthly") as "monthly" | "yearly";
      const amount = Number(dataObject?.amount_total || 0);
      const currency = String(dataObject?.currency || "usd").toUpperCase();
      const paymentIntentId = String(dataObject?.payment_intent || dataObject?.id || "");
      const sessionId = String(dataObject?.id || "");

      // Localiza Payment por userId + status pending (o mais recente).
      const payment = await prisma.payment.findFirst({
        where: { userId, status: "pending" },
        orderBy: { createdAt: "desc" },
      });
      if (!payment) {
        return NextResponse.json({ ok: true, ignored: "no_pending_payment", sessionId });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      if (cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      await markPayment({
        paymentId: payment.id,
        status: "paid",
        providerPaymentId: paymentIntentId,
        paymentMethod: "card",
        rawEvent: event,
      });
      await activateSubscription({
        userId: payment.userId,
        planCode: payment.planCode as PaidPlanCode,
        provider: "stripe",
        providerSubscriptionId: sessionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
      return NextResponse.json({ ok: true, activated: true, planCode: payment.planCode });
    }

    case "invoice.paid": {
      const userId = String(dataObject?.metadata?.userId || "");
      const paymentIntentId = String(dataObject?.payment_intent || dataObject?.id || "");
      const payment = await prisma.payment.findFirst({
        where: { userId, OR: [{ providerPaymentId: paymentIntentId }, { status: "pending" }] },
        orderBy: { createdAt: "desc" },
      });
      if (payment) {
        await markPayment({
          paymentId: payment.id,
          status: "paid",
          providerPaymentId: paymentIntentId,
          paymentMethod: "card",
          rawEvent: event,
        });
      }
      return NextResponse.json({ ok: true, event: type });
    }

    case "invoice.payment_failed": {
      const userId = String(dataObject?.metadata?.userId || "");
      if (userId) {
        await markSubscriptionPastDue(userId);
      }
      return NextResponse.json({ ok: true, event: type });
    }

    case "customer.subscription.updated": {
      // Renovacoes: atualiza currentPeriodEnd
      const userId = String(dataObject?.metadata?.userId || "");
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      if (sub && dataObject?.current_period_start && dataObject?.current_period_end) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            currentPeriodStart: new Date(Number(dataObject.current_period_start) * 1000),
            currentPeriodEnd: new Date(Number(dataObject.current_period_end) * 1000),
          },
        });
      }
      return NextResponse.json({ ok: true, event: type });
    }

    case "customer.subscription.deleted": {
      const userId = String(dataObject?.metadata?.userId || "");
      if (userId) {
        await cancelSubscriptionByUserId({ userId, reason: "user" });
      }
      return NextResponse.json({ ok: true, event: type });
    }

    default:
      return NextResponse.json({ ok: true, ignored: type });
  }
}
