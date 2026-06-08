import { NextResponse } from "next/server";
import { UsageError, getAnonymousUsageStatus, getAnonIdentity, isStoreReady } from "@/lib/anonymous-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ready = isStoreReady();
    if (!ready.ready) {
      return NextResponse.json(
        { error: "NOT_CONFIGURED", message: "Limite de uso não configurado." },
        { status: 503 },
      );
    }

    const identity = getAnonIdentity(request);
    const usage = await getAnonymousUsageStatus(identity);

    const response = NextResponse.json(
      {
        ...usage,
        backend: ready.backend,
        maxFileBytes: undefined,
        upgradeUrl: "/pricing",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );

    if (identity.anonIdNew) {
      response.cookies.set({
        name: "pdfmp_anon_id",
        value: identity.anonId,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 180,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    if (error instanceof UsageError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "Erro ao consultar uso.";
    return NextResponse.json({ error: "INTERNAL", message }, { status: 500 });
  }
}
