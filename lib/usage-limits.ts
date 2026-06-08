// Limites de uso por tipo de visitante / plano.
// Fonte única de verdade. Ajustar aqui afeta todas as checagens.

export const ANON_DAILY_LIMIT = 3;
export const ANON_MAX_FILE_MB = 10;

export const FREE_DAILY_LIMIT = 5;
export const FREE_MONTHLY_LIMIT = 30;
export const FREE_MAX_FILE_MB = 20;

// Premium — placeholders para Fase 4. Não implementados ainda.
export const PREMIUM_DAILY_LIMIT = Number.POSITIVE_INFINITY;
export const PREMIUM_MONTHLY_LIMIT = Number.POSITIVE_INFINITY;
export const PREMIUM_MAX_FILE_MB = 200;

export function limitsForPlan(planCode: "FREE" | "PREMIUM" | "BUSINESS") {
  switch (planCode) {
    case "PREMIUM":
      return {
        dailyLimit: PREMIUM_DAILY_LIMIT,
        monthlyLimit: PREMIUM_MONTHLY_LIMIT,
        maxFileMb: PREMIUM_MAX_FILE_MB,
      };
    case "BUSINESS":
      return {
        dailyLimit: PREMIUM_DAILY_LIMIT,
        monthlyLimit: PREMIUM_MONTHLY_LIMIT,
        maxFileMb: PREMIUM_MAX_FILE_MB,
      };
    case "FREE":
    default:
      return {
        dailyLimit: FREE_DAILY_LIMIT,
        monthlyLimit: FREE_MONTHLY_LIMIT,
        maxFileMb: FREE_MAX_FILE_MB,
      };
  }
}
