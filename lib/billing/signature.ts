// lib/billing/signature.ts
// Helpers de validacao de assinatura de webhook.
// Implementacao propria (nao usa o SDK oficial) para manter zero-deps
// e ser deterministica em testes.

import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Mercado Pago
// Documentacao oficial: header "x-signature" = "ts=...,v1=..."
// manifest = "id=<data.id>;request-id=<x-request-id>;ts=<ts>;"
// HMAC SHA-256 com o secret, em hex.
// ---------------------------------------------------------------------------

export function computeMercadoPagoSignature(args: {
  dataId: string;
  requestId: string;
  ts: string;
  secret: string;
}): string {
  const manifest = `id=${args.dataId};request-id=${args.requestId};ts=${args.ts};`;
  return crypto.createHmac("sha256", args.secret).update(manifest).digest("hex");
}

export function verifyMercadoPagoSignature(args: {
  rawHeader: string | null;
  dataId: string;
  requestId: string | null;
  secret: string;
}): boolean {
  if (!args.rawHeader) return false;
  const parts = Object.fromEntries(
    args.rawHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const expected = computeMercadoPagoSignature({
    dataId: args.dataId,
    requestId: args.requestId || "",
    ts,
    secret: args.secret,
  });
  if (expected.length !== v1.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

// ---------------------------------------------------------------------------
// Stripe
// Documentacao oficial: header "stripe-signature" = "t=...,v1=..."
// signed_payload = "<t>.<rawBody>"
// HMAC SHA-256 com o secret, em hex.
// ---------------------------------------------------------------------------

export function computeStripeSignature(args: { t: string; rawBody: string; secret: string }): string {
  const signed = `${args.t}.${args.rawBody}`;
  return crypto.createHmac("sha256", args.secret).update(signed).digest("hex");
}

export function verifyStripeSignature(args: {
  rawHeader: string | null;
  rawBody: string;
  secret: string;
}): boolean {
  if (!args.rawHeader) return false;
  const tMatch = args.rawHeader.match(/t=(\d+)/);
  const v1Match = args.rawHeader.match(/v1=([a-f0-9]+)/);
  if (!tMatch || !v1Match) return false;
  const expected = computeStripeSignature({
    t: tMatch[1],
    rawBody: args.rawBody,
    secret: args.secret,
  });
  if (expected.length !== v1Match[1].length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1Match[1]));
}
