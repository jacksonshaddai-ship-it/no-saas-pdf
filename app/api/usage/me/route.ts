import { NextResponse } from "next/server";
import { getMyUsageStatus } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const usage = await getMyUsageStatus(request);
    return NextResponse.json(usage, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar uso.";
    return NextResponse.json({ error: "INTERNAL", message }, { status: 500 });
  }
}
