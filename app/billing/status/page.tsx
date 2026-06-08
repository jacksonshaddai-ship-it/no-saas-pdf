// app/billing/status/page.tsx
// Status da assinatura e pagamentos do usuario logado.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBillingStatus } from "@/lib/billing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BillingStatusClient } from "./BillingStatusClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function BillingStatusPage(props: { searchParams: Promise<{ payment?: string; status?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <Header />
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-3xl font-black">Status da assinatura</h1>
          <p className="mt-4 text-slate-600">Você precisa estar logado para ver o status.</p>
          <a className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-black text-white" href="/login?callbackUrl=/billing/status">
            Entrar
          </a>
        </section>
        <Footer />
      </main>
    );
  }

  const params = await props.searchParams;
  const raw = await getBillingStatus(session.user.id).catch(() => null);
  const status = raw
    ? {
        planCode: raw.planCode,
        subscription: raw.subscription
          ? {
              id: raw.subscription.id,
              planCode: raw.subscription.planCode,
              status: raw.subscription.status,
              provider: raw.subscription.provider,
              currentPeriodStart: raw.subscription.currentPeriodStart
                ? raw.subscription.currentPeriodStart.toISOString()
                : null,
              currentPeriodEnd: raw.subscription.currentPeriodEnd
                ? raw.subscription.currentPeriodEnd.toISOString()
                : null,
              canceledAt: raw.subscription.canceledAt
                ? raw.subscription.canceledAt.toISOString()
                : null,
            }
          : null,
        payments: raw.payments.map((p) => ({
          id: p.id,
          provider: p.provider,
          status: p.status,
          planCode: p.planCode,
          billingCycle: p.billingCycle,
          amount: p.amount,
          currency: p.currency,
          checkoutUrl: p.checkoutUrl,
          createdAt: p.createdAt.toISOString(),
        })),
      }
    : null;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-black">Status da assinatura</h1>
        <BillingStatusClient
          initial={status}
          queryStatus={params?.status}
          queryPaymentId={params?.payment}
        />
      </section>
      <Footer />
    </main>
  );
}
