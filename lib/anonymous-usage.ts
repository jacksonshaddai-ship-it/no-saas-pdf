import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { PLANS } from "@/lib/plans";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const COOKIE_NAME = "pdfmp_anon_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 dias
const KEY_TTL_SECONDS = 48 * 60 * 60; // 48h, somente para garbage collection

// Limites do plano Anonimo vem de lib/plans.ts (fonte unica de verdade).
const ANON_PLAN = PLANS.ANONYMOUS;
const DEFAULT_DAILY_LIMIT = ANON_PLAN.dailyLimit ?? 3;
const DEFAULT_MAX_FILE_MB = ANON_PLAN.maxFileMb ?? 10;

export class UsageError extends Error {
  code: "NOT_CONFIGURED" | "ANON_LIMIT_EXCEEDED" | "FILE_TOO_LARGE" | "INTERNAL";
  status: number;
  constructor(message: string, code: UsageError["code"], status = 500) {
    super(message);
    this.name = "UsageError";
    this.code = code;
    this.status = status;
  }
}

type RuntimeConfig = {
  salt: string;
  dailyLimit: number;
  maxFileBytes: number;
  upstashUrl: string;
  upstashToken: string;
  isProd: boolean;
  upstashConfigured: boolean;
};

function getConfig(): RuntimeConfig {
  const isProd = process.env.NODE_ENV === "production";

  const rawLimit = parseInt(process.env.ANON_DAILY_LIMIT || "", 10);
  const dailyLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_DAILY_LIMIT;

  const rawMb = parseInt(process.env.ANON_MAX_FILE_MB || "", 10);
  const maxFileMb = Number.isFinite(rawMb) && rawMb > 0 ? rawMb : DEFAULT_MAX_FILE_MB;

  const envSalt = process.env.ANON_HASH_SALT;
  const salt = envSalt && envSalt.length > 0 ? envSalt : isProd ? "" : "dev-only-do-not-use-in-prod";

  if (isProd && !salt) {
    throw new UsageError(
      "Configuração ausente: defina ANON_HASH_SALT em produção.",
      "NOT_CONFIGURED",
      503,
    );
  }

  const upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  const upstashConfigured = Boolean(upstashUrl && upstashToken);

  if (isProd && !upstashConfigured) {
    throw new UsageError(
      "Rate limiting não configurado em produção. Defina UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.",
      "NOT_CONFIGURED",
      503,
    );
  }

  return {
    salt,
    dailyLimit,
    maxFileBytes: maxFileMb * 1024 * 1024,
    upstashUrl,
    upstashToken,
    isProd,
    upstashConfigured,
  };
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx);
    if (key === name) return decodeURIComponent(trimmed.slice(idx + 1));
  }
  return null;
}

function isValidAnonId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(value);
}

export function applyAnonCookie(response: NextResponse, identity: AnonIdentity): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: identity.anonId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

// ---------------------------------------------------------------------------
// Identidade anônima
// ---------------------------------------------------------------------------

export type AnonIdentity = {
  anonId: string;
  anonIdNew: boolean;
  anonHash: string;
  ipHash: string;
  fingerprintHash: string;
  clientIp: string;
};

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "0.0.0.0";
  return "0.0.0.0";
}

function hashWithSalt(salt: string, parts: string[]): string {
  const hash = createHash("sha256");
  hash.update(salt);
  hash.update("|");
  hash.update(parts.join("|"));
  return hash.digest("hex").slice(0, 40);
}

export function getAnonIdentity(request: Request): AnonIdentity {
  const config = getConfig();

  const cookieHeader = request.headers.get("cookie");
  const existing = parseCookie(cookieHeader, COOKIE_NAME);
  const anonId = existing && isValidAnonId(existing) ? existing : randomUUID();
  const anonIdNew = !(existing && isValidAnonId(existing));

  const clientIp = getClientIp(request);
  const ua = request.headers.get("user-agent") || "";
  const lang = request.headers.get("accept-language") || "";
  const country = request.headers.get("x-vercel-ip-country") || "";

  return {
    anonId,
    anonIdNew,
    anonHash: hashWithSalt(config.salt, ["anon", anonId]),
    ipHash: hashWithSalt(config.salt, ["ip", clientIp]),
    fingerprintHash: hashWithSalt(config.salt, ["fp", clientIp, ua, lang, country, anonId]),
    clientIp,
  };
}

export function getOrCreateAnonCookie(request: Request): { anonId: string; created: boolean } {
  const identity = getAnonIdentity(request);
  return { anonId: identity.anonId, created: identity.anonIdNew };
}

// ---------------------------------------------------------------------------
// Storage abstrato: Upstash em prod, in-memory fallback em dev
// ---------------------------------------------------------------------------

interface UsageStore {
  getMany(keys: string[]): Promise<number[]>;
  incrMany(keys: string[], ttlSeconds: number): Promise<void>;
  describe(): string;
}

let warnedAboutMemoryStore = false;
let cachedStore: UsageStore | null = null;

function createMemoryStore(): UsageStore {
  if (!warnedAboutMemoryStore) {
    warnedAboutMemoryStore = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[anonymous-usage] Upstash não configurado. Usando fallback in-memory. NÃO USE EM PRODUÇÃO.",
    );
  }

  const store = new Map<string, { value: number; expiresAt: number }>();

  function read(key: string): number {
    const entry = store.get(key);
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return 0;
    }
    return entry.value;
  }

  return {
    async getMany(keys) {
      return keys.map((key) => read(key));
    },
    async incrMany(keys, ttlSeconds) {
      const now = Date.now();
      for (const key of keys) {
        const existing = store.get(key);
        if (!existing || now > existing.expiresAt) {
          store.set(key, { value: 1, expiresAt: now + ttlSeconds * 1000 });
        } else {
          store.set(key, { value: existing.value + 1, expiresAt: now + ttlSeconds * 1000 });
        }
      }
    },
    describe() {
      return "memory";
    },
  };
}

function createUpstashStore(url: string, token: string): UsageStore {
  async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new UsageError(
        `Upstash respondeu ${response.status}: ${text}`.trim(),
        "INTERNAL",
        502,
      );
    }
    const json = (await response.json()) as { result: unknown }[];
    return json.map((entry) => entry.result);
  }

  return {
    async getMany(keys) {
      if (keys.length === 0) return [];
      const commands = keys.map((key) => ["GET", key] as (string | number)[]);
      const results = await pipeline(commands);
      return results.map((value) => {
        if (value === null || value === undefined) return 0;
        const parsed = parseInt(String(value), 10);
        return Number.isFinite(parsed) ? parsed : 0;
      });
    },
    async incrMany(keys, ttlSeconds) {
      if (keys.length === 0) return;
      const commands: (string | number)[][] = [];
      for (const key of keys) {
        commands.push(["INCR", key]);
        commands.push(["EXPIRE", key, ttlSeconds]);
      }
      await pipeline(commands);
    },
    describe() {
      return "upstash";
    },
  };
}

function getStore(): UsageStore {
  if (cachedStore) return cachedStore;
  const config = getConfig();
  cachedStore = config.upstashConfigured
    ? createUpstashStore(config.upstashUrl, config.upstashToken)
    : createMemoryStore();
  return cachedStore;
}

// ---------------------------------------------------------------------------
// Keys e datas
// ---------------------------------------------------------------------------

function todayKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextMidnightUtcIso(now = new Date()): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return next.toISOString();
}

function counterKeys(identity: AnonIdentity, tool?: string): {
  anon: string;
  ip: string;
  fp: string;
  toolKey: string | null;
} {
  const date = todayKey();
  return {
    anon: `anon:${identity.anonHash}:${date}:count`,
    ip: `ip:${identity.ipHash}:${date}:count`,
    fp: `fp:${identity.fingerprintHash}:${date}:count`,
    toolKey: tool ? `anon:${identity.anonHash}:${date}:tool:${tool}` : null,
  };
}

// ---------------------------------------------------------------------------
// API pública: check / increment / status
// ---------------------------------------------------------------------------

export type UsageStatus = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

export type LimitCheckResult =
  | { ok: true; usage: UsageStatus }
  | {
      ok: false;
      code: "ANON_LIMIT_EXCEEDED" | "FILE_TOO_LARGE";
      message: string;
      status: number;
      usage: UsageStatus;
    };

function buildUsage(used: number, limit: number): UsageStatus {
  const remaining = Math.max(0, limit - used);
  return {
    limit,
    used: Math.min(used, limit),
    remaining,
    resetAt: nextMidnightUtcIso(),
  };
}

export async function getAnonymousUsageStatus(identity: AnonIdentity): Promise<UsageStatus> {
  const config = getConfig();
  const store = getStore();
  const keys = counterKeys(identity);
  const [anonCount, ipCount, fpCount] = await store.getMany([keys.anon, keys.ip, keys.fp]);
  const used = Math.max(anonCount, ipCount, fpCount);
  return buildUsage(used, config.dailyLimit);
}

export async function checkAnonymousLimit(
  identity: AnonIdentity,
  tool: string,
  sizeBytes: number,
): Promise<LimitCheckResult> {
  const config = getConfig();

  if (sizeBytes > config.maxFileBytes) {
    const usage = await getAnonymousUsageStatus(identity);
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      status: 413,
      message: `Visitantes podem processar arquivos de até ${Math.round(
        config.maxFileBytes / (1024 * 1024),
      )} MB. Crie uma conta ou assine Premium para arquivos maiores.`,
      usage,
    };
  }

  const store = getStore();
  const keys = counterKeys(identity, tool);
  const [anonCount, ipCount, fpCount] = await store.getMany([keys.anon, keys.ip, keys.fp]);
  const used = Math.max(anonCount, ipCount, fpCount);

  if (used >= config.dailyLimit) {
    return {
      ok: false,
      code: "ANON_LIMIT_EXCEEDED",
      status: 429,
      message: `Você usou suas ${config.dailyLimit} tarefas grátis de hoje. Crie uma conta grátis para liberar mais tarefas ou assine o Premium.`,
      usage: buildUsage(used, config.dailyLimit),
    };
  }

  return { ok: true, usage: buildUsage(used, config.dailyLimit) };
}

export async function incrementAnonymousUsage(identity: AnonIdentity, tool: string): Promise<UsageStatus> {
  const config = getConfig();
  const store = getStore();
  const keys = counterKeys(identity, tool);

  const targetKeys = [keys.anon, keys.ip, keys.fp];
  if (keys.toolKey) targetKeys.push(keys.toolKey);

  await store.incrMany(targetKeys, KEY_TTL_SECONDS);

  const [anonCount, ipCount, fpCount] = await store.getMany([keys.anon, keys.ip, keys.fp]);
  const used = Math.max(anonCount, ipCount, fpCount);
  return buildUsage(used, config.dailyLimit);
}

export function getDailyLimit(): number {
  return getConfig().dailyLimit;
}

export function getMaxFileBytes(): number {
  return getConfig().maxFileBytes;
}

export function isStoreReady(): { ready: boolean; backend: "upstash" | "memory" } {
  const config = getConfig();
  return {
    ready: config.upstashConfigured || !config.isProd,
    backend: config.upstashConfigured ? "upstash" : "memory",
  };
}
