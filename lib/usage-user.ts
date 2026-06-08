import "server-only";

import { prisma } from "@/lib/prisma";
import { PLANS, type PlanCode } from "@/lib/plans";

export type UserPlanCode = "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE";

export type UserUsageStatus = {
  type: "user";
  planCode: UserPlanCode;
  plan: PlanCode;
  dailyLimit: number;
  monthlyLimit: number;
  maxFileMb: number;
  dailyUsed: number;
  monthlyUsed: number;
  remainingDaily: number;
  remainingMonthly: number;
  resetDailyAt: string;
  resetMonthlyAt: string;
};

export type UserLimitError = "USER_LIMIT_EXCEEDED" | "USER_FILE_TOO_LARGE" | "USER_PLAN_UNSUPPORTED";

export type UserCheckResult =
  | { ok: true; usage: UserUsageStatus }
  | {
      ok: false;
      code: UserLimitError;
      status: number;
      message: string;
      upgradeUrl: string;
      usage: UserUsageStatus;
    };

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function startOfNextDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
}
function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function startOfNextMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/**
 * Resolve o plano canonico (PlanCode) a partir do codigo armazenado
 * no banco. Aceita os codigos da Fase 4/5 (FREE | PLUS | PREMIUM | ENTERPRISE)
 * e o legado "BUSINESS" (mapeado para PREMIUM).
 */
export function resolvePlanCode(planCode: string | null | undefined): UserPlanCode {
  if (planCode === "PLUS" || planCode === "PREMIUM" || planCode === "ENTERPRISE") {
    return planCode;
  }
  if (planCode === "BUSINESS") return "PREMIUM";
  return "FREE";
}

function limitsFor(planCode: UserPlanCode): { dailyLimit: number; monthlyLimit: number; maxFileMb: number } {
  if (planCode === "PREMIUM") {
    return {
      dailyLimit: PLANS.PREMIUM.dailyLimit ?? Number.POSITIVE_INFINITY,
      monthlyLimit: PLANS.PREMIUM.monthlyLimit ?? Number.POSITIVE_INFINITY,
      maxFileMb: PLANS.PREMIUM.maxFileMb ?? 1024,
    };
  }
  if (planCode === "PLUS") {
    return {
      dailyLimit: PLANS.PLUS.dailyLimit ?? Number.POSITIVE_INFINITY,
      monthlyLimit: PLANS.PLUS.monthlyLimit ?? Number.POSITIVE_INFINITY,
      maxFileMb: PLANS.PLUS.maxFileMb ?? 250,
    };
  }
  if (planCode === "ENTERPRISE") {
    return {
      dailyLimit: PLANS.ENTERPRISE.dailyLimit ?? Number.POSITIVE_INFINITY,
      monthlyLimit: PLANS.ENTERPRISE.monthlyLimit ?? Number.POSITIVE_INFINITY,
      maxFileMb: PLANS.ENTERPRISE.maxFileMb ?? 1024,
    };
  }
  return {
    dailyLimit: PLANS.FREE.dailyLimit ?? 5,
    monthlyLimit: PLANS.FREE.monthlyLimit ?? 30,
    maxFileMb: PLANS.FREE.maxFileMb ?? 20,
  };
}

export async function getUserUsageStatus(
  userId: string,
  planCode: UserPlanCode,
): Promise<UserUsageStatus> {
  const now = new Date();
  const dayStart = startOfDayUtc(now);
  const nextDay = startOfNextDayUtc(now);
  const monthStart = startOfMonthUtc(now);
  const nextMonth = startOfNextMonthUtc(now);

  const [dailyUsed, monthlyUsed] = await Promise.all([
    prisma.usageLog.count({
      where: { userId, createdAt: { gte: dayStart, lt: nextDay } },
    }),
    prisma.usageLog.count({
      where: { userId, createdAt: { gte: monthStart, lt: nextMonth } },
    }),
  ]);

  const limits = limitsFor(planCode);
  const plan: PlanCode =
    planCode === "PREMIUM" ? "PREMIUM" :
    planCode === "PLUS" ? "PLUS" :
    planCode === "ENTERPRISE" ? "ENTERPRISE" : "FREE";

  return {
    type: "user",
    planCode,
    plan,
    dailyLimit: limits.dailyLimit,
    monthlyLimit: limits.monthlyLimit,
    maxFileMb: limits.maxFileMb,
    dailyUsed,
    monthlyUsed,
    remainingDaily: Math.max(0, limits.dailyLimit - dailyUsed),
    remainingMonthly: Math.max(0, limits.monthlyLimit - monthlyUsed),
    resetDailyAt: nextDay.toISOString(),
    resetMonthlyAt: nextMonth.toISOString(),
  };
}

export async function checkUserLimit(
  userId: string,
  planCode: UserPlanCode,
  tool: string,
  sizeBytes: number,
): Promise<UserCheckResult> {
  const usage = await getUserUsageStatus(userId, planCode);
  const limits = limitsFor(planCode);
  const maxFileBytes = limits.maxFileMb * 1024 * 1024;

  if (sizeBytes > maxFileBytes) {
    return {
      ok: false,
      code: "USER_FILE_TOO_LARGE",
      status: 413,
      message: `Seu plano permite arquivos de até ${limits.maxFileMb} MB. Faça upgrade para liberar arquivos maiores.`,
      upgradeUrl: "/pricing",
      usage,
    };
  }

  if (usage.dailyUsed >= usage.dailyLimit) {
    return {
      ok: false,
      code: "USER_LIMIT_EXCEEDED",
      status: 429,
      message: `Você atingiu o limite diário do seu plano. Faça upgrade para liberar mais tarefas.`,
      upgradeUrl: "/pricing",
      usage,
    };
  }
  if (usage.monthlyUsed >= usage.monthlyLimit) {
    return {
      ok: false,
      code: "USER_LIMIT_EXCEEDED",
      status: 429,
      message: `Você atingiu o limite mensal do seu plano. Faça upgrade para liberar mais tarefas.`,
      upgradeUrl: "/pricing",
      usage,
    };
  }

  // tool é usado aqui para futura extensibilidade (ex.: limites por ferramenta)
  void tool;
  return { ok: true, usage };
}

export async function logUserUsage(
  userId: string,
  tool: string,
  sizeBytes: number,
  success: boolean,
): Promise<void> {
  await prisma.usageLog.create({
    data: { userId, tool, sizeBytes, success },
  });
}
