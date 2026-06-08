// app/api/billing/status/route.ts
// Retorna plano atual, assinatura e pagamentos recentes do usuario logado.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BillingError, getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED", message: "Faca login para ver o status." },
        { status: 401 },
      );
    }
    const data = await getBillingStatus(session.user.id);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Erro ao obter status.";
    return NextResponse.json({ error: "INTERNAL", message }, { status: 500 });
  }
}
