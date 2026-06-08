// app/api/webhooks/mercado-pago/route.ts
// Recebe webhooks do Mercado Pago. Ativa plano SOMENTE com status approved/paid.
// Em dev, MERCADO_PAGO_WEBHOOK_SECRET ausente => validacao de assinatura eh
// pulada (avisado nos logs). Em prod, a assinatura DEVE validar.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  activateSubscription,
  markPayment,
  markSubscriptionPastDue,
  cancelSubscriptionByUserId,
  type PaidPlanCode,
} from "@/lib/billing";
import { verifyMercadoPagoSignature } from "@/lib/billing/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKIP_SIG = process.env.BILLING_SKIP_WEBHOOK_SIG === "1";

export async function POST(request: Request) {
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  // Mercado Pago envia varios tipos de evento. O que nos interessa
  // para ativacao eh o tipo "payment" (e opcionalmente "subscription_preapproval").
  const type = String(body?.type || body?.action || "");
  const dataId = String(body?.data?.id || body?.id || "");

  if (!dataId) {
    return NextResponse.json({ error: "MISSING_DATA_ID" }, { status: 400 });
  }

  // Validacao de assinatura, se houver secret configurado.
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (secret && !SKIP_SIG) {
    const rawHeader = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id");
    const ok = verifyMercadoPagoSignature({
      rawHeader,
      dataId,
      requestId,
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
    }
  }

  // Para ativacao usamos o evento de pagamento. O mock envia o payment
  // completo no body em "data" ou no campo "payment".
  const paymentData = body?.data || body?.payment || {};
  const status = String(paymentData?.status || body?.status || "").toLowerCase();
  const externalRef = String(paymentData?.external_reference || body?.external_reference || "");
  const planCode: PaidPlanCode = (paymentData?.metadata?.planCode || body?.metadata?.planCode || "PREMIUM") as PaidPlanCode;
  const cycle: "monthly" | "yearly" = (paymentData?.metadata?.cycle || body?.metadata?.cycle || "monthly") as any;
  const providerPaymentId = String(paymentData?.id || dataId);
  const paymentMethod = paymentData?.payment_method_id || paymentData?.payment_type_id || null;
  const amount = Number(paymentData?.transaction_amount ? Math.round(paymentData.transaction_amount * 100) : 0);
  const currency = String(paymentData?.currency_id || "BRL");

  // Tenta localizar Payment/ Subscription pelo external_reference (= userId)
  // ou pelo providerCheckoutId (id da preference) ou providerPaymentId.
  const payment = await prisma.payment.findFirst({
    where: {
      userId: externalRef || undefined,
      OR: [
        { providerCheckoutId: String(paymentData?.preference_id || "") },
        { providerCheckoutId: String(body?.preference_id || "") },
        { providerPaymentId: providerPaymentId },
        { id: String(paymentData?.metadata?.paymentId || body?.metadata?.paymentId || "") },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    // Webhook chegou antes do checkout ter sido persistido, ou referencia
    // invalida. Em prod, preferimos 200 para o MP nao reentregar.
    return NextResponse.json({ ok: true, ignored: true, reason: "payment_not_found", dataId }, { status: 200 });
  }

  if (status === "approved" || status === "paid") {
    const now = new Date();
    const periodEnd = new Date(now);
    if (cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await markPayment({
      paymentId: payment.id,
      status: "approved",
      providerPaymentId,
      paymentMethod,
      rawEvent: body,
    });
    await activateSubscription({
      userId: payment.userId,
      planCode: payment.planCode as PaidPlanCode,
      provider: "mercado_pago",
      providerSubscriptionId: providerPaymentId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
    return NextResponse.json({ ok: true, activated: true, planCode: payment.planCode });
  }

  if (status === "pending" || status === "in_process" || status === "authorized") {
    await markPayment({
      paymentId: payment.id,
      status: "pending",
      providerPaymentId,
      paymentMethod,
      rawEvent: body,
    });
    return NextResponse.json({ ok: true, status: "pending" });
  }

  if (status === "rejected" || status === "failed") {
    await markPayment({
      paymentId: payment.id,
      status: "failed",
      providerPaymentId,
      paymentMethod,
      rawEvent: body,
    });
    await markSubscriptionPastDue(payment.userId);
    return NextResponse.json({ ok: true, status: "failed" });
  }

  if (status === "cancelled" || status === "canceled" || status === "refunded") {
    await markPayment({
      paymentId: payment.id,
      status: status === "refunded" ? "refunded" : "canceled",
      providerPaymentId,
      paymentMethod,
      rawEvent: body,
    });
    await cancelSubscriptionByUserId({ userId: payment.userId, reason: "user" });
    return NextResponse.json({ ok: true, status: "canceled" });
  }

  // Status desconhecido: registra mas nao altera.
  return NextResponse.json({ ok: true, status: "unknown", type });
}
