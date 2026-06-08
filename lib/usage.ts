import "server-only";

import { auth } from "@/lib/auth";
import { canUseTool, type CanUseErrorCode } from "@/lib/can-use";
import { PLANS, type PlanCode } from "@/lib/plans";
import {
  checkAnonymousLimit,
  getAnonIdentity,
  getAnonymousUsageStatus,
  incrementAnonymousUsage,
  isStoreReady,
} from "@/lib/anonymous-usage";
import {
  checkUserLimit,
  getUserUsageStatus,
  logUserUsage,
  resolvePlanCode,
  type UserPlanCode,
  type UserUsageStatus,
} from "@/lib/usage-user";

// ===========================================================================
// Tipos públicos
// ===========================================================================

export type MeUsageStatus = (
  | { type: "anonymous"; limit: number; used: number; remaining: number; resetAt: string; maxFileMb: number; backend: "upstash" | "memory" }
  | (UserUsageStatus & { type: "user" })
) & {
  upgradeUrl: string;
};

export type CheckUsageErrorCode =
  | "ANON_LIMIT_EXCEEDED"
  | "FILE_TOO_LARGE"
  | "USER_LIMIT_EXCEEDED"
  | "USER_FILE_TOO_LARGE"
  | "USER_PLAN_UNSUPPORTED"
  | "NOT_CONFIGURED"
  | "TOOL_NOT_FOUND"
  | "TOOL_COMING_SOON"
  | "TOOL_REQUIRES_PLUS"
  | "TOOL_REQUIRES_PREMIUM"
  | "TOOL_REQUIRES_ENTERPRISE"
  | "PLAN_LIMIT_EXCEEDED";

export type CheckUsageResult =
  | { ok: true; mode: "anonymous" | "user"; usage: MeUsageStatus }
  | {
      ok: false;
      mode: "anonymous" | "user";
      code: CheckUsageErrorCode;
      status: number;
      message: string;
      upgradeUrl: string;
      usage: MeUsageStatus;
    };

// ===========================================================================
// Funções de checagem
// ===========================================================================

function planCodeForUser(sessionPlan: string | null | undefined): UserPlanCode {
  return resolvePlanCode(sessionPlan);
}

function effectivePlanFromUserCode(code: UserPlanCode): PlanCode {
  if (code === "PREMIUM" || code === "PLUS" || code === "ENTERPRISE") {
    return code;
  }
  return "FREE";
}

export async function getMyUsageStatus(request: Request): Promise<MeUsageStatus> {
  const session = await auth();
  if (session?.user?.id) {
    const userPlan = planCodeForUser(session.user.planCode);
    const planCode = effectivePlanFromUserCode(userPlan);
    const userUsage = await getUserUsageStatus(session.user.id, userPlan);
    return { ...userUsage, upgradeUrl: "/pricing" };
  }
  const identity = getAnonIdentity(request);
  const anon = await getAnonymousUsageStatus(identity);
  const maxFileMb = PLANS.ANONYMOUS.maxFileMb ?? 10;
  const store = isStoreReady();
  return {
    type: "anonymous",
    limit: anon.limit,
    used: anon.used,
    remaining: anon.remaining,
    resetAt: anon.resetAt,
    maxFileMb,
    backend: store.backend,
    upgradeUrl: "/pricing",
  };
}

export async function checkUsageLimit(
  request: Request,
  tool: string,
  sizeBytes: number,
): Promise<CheckUsageResult> {
  const session = await auth();
  if (session?.user?.id) {
    const userPlan = planCodeForUser(session.user.planCode);
    const planCode = effectivePlanFromUserCode(userPlan);

    // 1) canUseTool: verifica minimumPlan e status da ferramenta (sem checar tamanho;
    //    a checagem de tamanho fica por conta de checkUserLimit para manter
    //    o c\u00f3digo USER_FILE_TOO_LARGE para usu\u00e1rios logados).
    const gate = canUseTool(planCode, tool);
    if (!gate.ok) {
      const usage = await getUserUsageStatus(session.user.id, userPlan);
      return {
        ok: false,
        mode: "user",
        code: gate.code as CheckUsageErrorCode,
        status: gate.status,
        message: gate.message,
        upgradeUrl: gate.upgradeUrl,
        usage: { ...usage, upgradeUrl: "/pricing" },
      };
    }

    // 2) checa limite de uso + tamanho (FREE: 5/dia, 30/mes, at\u00e9 20MB)
    const result = await checkUserLimit(session.user.id, userPlan, tool, sizeBytes);
    if (result.ok) {
      return { ok: true, mode: "user", usage: { ...result.usage, upgradeUrl: "/pricing" } };
    }
    return {
      ok: false,
      mode: "user",
      code: result.code as CheckUsageErrorCode,
      status: result.status,
      message: result.message,
      upgradeUrl: result.upgradeUrl,
      usage: { ...result.usage, upgradeUrl: result.upgradeUrl },
    };
  }

  // Anonimo: minimumPlan deve ser ANONYMOUS.
  const identity = getAnonIdentity(request);
  const gate = canUseTool("ANONYMOUS", tool);
  if (!gate.ok) {
    const anon = await getAnonymousUsageStatus(identity);
    const maxFileMb = PLANS.ANONYMOUS.maxFileMb ?? 10;
    const store = isStoreReady();
    return {
      ok: false,
      mode: "anonymous",
      code: gate.code as CheckUsageErrorCode,
      status: gate.status,
      message: gate.message,
      upgradeUrl: gate.upgradeUrl,
      usage: {
        type: "anonymous",
        limit: anon.limit,
        used: anon.used,
        remaining: anon.remaining,
        resetAt: anon.resetAt,
        maxFileMb,
        backend: store.backend,
        upgradeUrl: "/pricing",
      },
    };
  }

  const result = await checkAnonymousLimit(identity, tool, sizeBytes);
  const maxFileMb = PLANS.ANONYMOUS.maxFileMb ?? 10;
  if (result.ok) {
    return {
      ok: true,
      mode: "anonymous",
      usage: {
        type: "anonymous",
        limit: result.usage.limit,
        used: result.usage.used,
        remaining: result.usage.remaining,
        resetAt: result.usage.resetAt,
        maxFileMb,
        backend: isStoreReady().backend,
        upgradeUrl: "/pricing",
      },
    };
  }
  return {
    ok: false,
    mode: "anonymous",
    code: result.code,
    status: result.status,
    message: result.message,
    upgradeUrl: "/pricing",
    usage: {
      type: "anonymous",
      limit: result.usage.limit,
      used: result.usage.used,
      remaining: result.usage.remaining,
      resetAt: result.usage.resetAt,
      maxFileMb,
      backend: isStoreReady().backend,
      upgradeUrl: "/pricing",
    },
  };
}

// ===========================================================================
// Incremento / log após job criado
// ===========================================================================

export type IncrementResult = {
  mode: "anonymous" | "user";
  usage: MeUsageStatus;
};

export async function incrementUsage(
  request: Request,
  tool: string,
  sizeBytes: number,
  success: boolean,
): Promise<IncrementResult> {
  const session = await auth();
  if (session?.user?.id) {
    const userPlan = planCodeForUser(session.user.planCode);
    await logUserUsage(session.user.id, tool, sizeBytes, success);
    const userUsage = await getUserUsageStatus(session.user.id, userPlan);
    return { mode: "user", usage: { ...userUsage, upgradeUrl: "/pricing" } };
  }
  const identity = getAnonIdentity(request);
  const anon = await incrementAnonymousUsage(identity, tool);
  const maxFileMb = PLANS.ANONYMOUS.maxFileMb ?? 10;
  return {
    mode: "anonymous",
    usage: {
      type: "anonymous",
      limit: anon.limit,
      used: anon.used,
      remaining: anon.remaining,
      resetAt: anon.resetAt,
      maxFileMb,
      backend: isStoreReady().backend,
      upgradeUrl: "/pricing",
    },
  };
}
