// app/api/billing/checkout/route.ts
// Cria checkout para Plus / Premium. Enterprise nao passa por aqui.

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  BillingError,
  createCheckout,
  isMercadoPagoConfigured,
  isStripeConfigured,
} from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  planCode: z.enum(["PLUS", "PREMIUM", "ENTERPRISE"]),
  billingCycle: z.enum(["monthly", "yearly"]),
  country: z.enum(["BR", "GLOBAL"]),
  currency: z.enum(["BRL", "USD"]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED", message: "Faca login para assinar." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_JSON", message: "Corpo precisa ser JSON valido." },
        { status: 400 },
      );
    }

    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Dados invalidos.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (parsed.data.planCode === "ENTERPRISE") {
      return NextResponse.json(
        {
          error: "ENTERPRISE_CONTACT_ONLY",
          message: "Plano Enterprise e sob consulta. Use /contact-sales.",
          contactUrl: "/contact-sales",
        },
        { status: 400 },
      );
    }

    // Aviso claro se o provedor escolhido nao estiver configurado.
    if (parsed.data.country === "BR" && !isMercadoPagoConfigured().ok) {
      return NextResponse.json(
        {
          error: "MP_NOT_CONFIGURED",
          message: "Mercado Pago nao configurado no servidor.",
          missing: ["MERCADO_PAGO_ACCESS_TOKEN"],
        },
        { status: 503 },
      );
    }
    if (parsed.data.country === "GLOBAL" && !isStripeConfigured().ok) {
      return NextResponse.json(
        {
          error: "STRIPE_NOT_CONFIGURED",
          message: "Stripe nao configurado no servidor.",
          missing: ["STRIPE_SECRET_KEY"],
        },
        { status: 503 },
      );
    }

    const result = await createCheckout({
      userId: session.user.id,
      planCode: parsed.data.planCode,
      billingCycle: parsed.data.billingCycle,
      country: parsed.data.country,
      currency: parsed.data.currency,
    });

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(
        { error: err.code, message: err.message, details: err.details },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : "Erro ao criar checkout.";
    return NextResponse.json({ error: "INTERNAL", message }, { status: 500 });
  }
}
