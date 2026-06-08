// lib/rate-limit.ts
// Rate limit simples por chave (userId, anonId, IP hash).
// Quando o Upstash Redis esta configurado, usa o Redis (mesma interface REST
// que anonymous-usage.ts). Caso contrario, usa um fallback in-memory, com
// aviso no console. A politica do produto eh: protecao basica contra
// abuso, sem transformarmos isso em funcionalidade visivel ao usuario.

import "server-only";

import { getAnonIdentity, type AnonIdentity } from "./anonymous-usage";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

const GLOBAL_FALLBACK = new Map<string, { count: number; resetAt: number }>();

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// ===== Backend Upstash (HTTP REST) =====

type UpstashResponse = { result: number | string };

async function upstashEval(script: string, keys: string[], args: (string | number)[]): Promise<UpstashResponse> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("upstash-not-configured");

  const body = JSON.stringify([script, keys, args]);
  const res = await fetch(`${url}/eval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash-status-${res.status}`);
  return (await res.json()) as UpstashResponse;
}

const SLIDING_WINDOW_LUA = `
local key   = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl   = tonumber(ARGV[2])
local now   = tonumber(ARGV[3])
local count = redis.call("INCR", key)
if count == 1 then
  redis.call("EXPIRE", key, ttl)
end
if count > limit then
  local pttl = redis.call("PTTL", key)
  return pttl > 0 and pttl or 1000
end
return 0
`.trim();

async function upstashCheck(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = nowSeconds();
  try {
    const r = await upstashEval(SLIDING_WINDOW_LUA, [key], [limit, windowSeconds, now]);
    const retryAfterMs = Number(r.result) || 0;
    if (retryAfterMs > 0) {
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }
    return { ok: true };
  } catch {
    // Cai para o fallback.
    return memoryCheck(key, limit, windowSeconds);
  }
}

// ===== Backend em memoria (fallback) =====

function memoryCheck(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = nowSeconds();
  const entry = GLOBAL_FALLBACK.get(key);
  if (!entry || entry.resetAt <= now) {
    GLOBAL_FALLBACK.set(key, { count: 1, resetAt: now + windowSeconds });
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, entry.resetAt - now) };
  }
  return { ok: true };
}

function isUpstashReady(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ===== APIs publicas =====

function userKey(userId: string, bucket: string): string {
  return `rl:u:${userId}:${bucket}`;
}

function anonKey(identity: AnonIdentity, bucket: string): string {
  return `rl:a:${identity.anonHash}:${bucket}`;
}

export async function checkUserCallRate(
  userId: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = userKey(userId, bucket);
  if (isUpstashReady()) return upstashCheck(key, limit, windowSeconds);
  return memoryCheck(key, limit, windowSeconds);
}

export async function checkAnonCallRate(
  identity: AnonIdentity,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = anonKey(identity, bucket);
  if (isUpstashReady()) return upstashCheck(key, limit, windowSeconds);
  return memoryCheck(key, limit, windowSeconds);
}

export function rateLimitIdentityFromRequest(request: Request): AnonIdentity {
  return getAnonIdentity(request);
}
