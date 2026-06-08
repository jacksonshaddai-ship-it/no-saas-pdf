import "server-only";
import { planCovers, type PlanCode } from "@/lib/plans";
import { getToolById, type Tool } from "@/lib/tools";

// ===========================================================================
// Resultado de canUseTool
// ===========================================================================

export type CanUseResult =
  | { ok: true; tool: Tool }
  | {
      ok: false;
      code: CanUseErrorCode;
      status: number;
      message: string;
      upgradeUrl: string;
      minimumPlan: PlanCode;
      tool?: Tool;
    };

export type CanUseErrorCode =
  | "TOOL_NOT_FOUND"
  | "TOOL_COMING_SOON"
  | "TOOL_REQUIRES_PLUS"
  | "TOOL_REQUIRES_PREMIUM"
  | "TOOL_REQUIRES_ENTERPRISE"
  | "FILE_TOO_LARGE";

const UPGRADE_URL = "/pricing";

/**
 * canUseTool(userPlan, toolId, sizeBytes)
 *   - verifica se a ferramenta existe e esta implementada
 *   - verifica se o plano do usuario cobre o minimumPlan da ferramenta
 *   - retorna erro tipado para o caller exibir mensagem e CTA
 */
export function canUseTool(
  userPlan: PlanCode,
  toolId: string,
  sizeBytes?: number,
): CanUseResult {
  const tool = getToolById(toolId);

  if (!tool) {
    return {
      ok: false,
      code: "TOOL_NOT_FOUND",
      status: 404,
      message: "Ferramenta desconhecida.",
      upgradeUrl: UPGRADE_URL,
      minimumPlan: "ANONYMOUS",
    };
  }

  if (!tool.implemented) {
    return {
      ok: false,
      code: "TOOL_COMING_SOON",
      status: 409,
      message: "Esta ferramenta estará disponível em breve.",
      upgradeUrl: UPGRADE_URL,
      minimumPlan: tool.minimumPlan,
      tool,
    };
  }

  if (!planCovers(userPlan, tool.minimumPlan)) {
    if (tool.minimumPlan === "ENTERPRISE") {
      return {
        ok: false,
        code: "TOOL_REQUIRES_ENTERPRISE",
        status: 403,
        message: "Esta ferramenta está disponível no plano Enterprise.",
        upgradeUrl: UPGRADE_URL,
        minimumPlan: tool.minimumPlan,
        tool,
      };
    }
    if (tool.minimumPlan === "PREMIUM") {
      return {
        ok: false,
        code: "TOOL_REQUIRES_PREMIUM",
        status: 403,
        message: "Esta ferramenta está disponível no plano Premium.",
        upgradeUrl: UPGRADE_URL,
        minimumPlan: tool.minimumPlan,
        tool,
      };
    }
    if (tool.minimumPlan === "PLUS") {
      return {
        ok: false,
        code: "TOOL_REQUIRES_PLUS",
        status: 403,
        message: "Esta ferramenta está disponível no plano Plus.",
        upgradeUrl: UPGRADE_URL,
        minimumPlan: tool.minimumPlan,
        tool,
      };
    }
    return {
      ok: false,
      code: "TOOL_REQUIRES_PLUS",
      status: 403,
      message: "Esta ferramenta não está disponível no seu plano atual.",
      upgradeUrl: UPGRADE_URL,
      minimumPlan: tool.minimumPlan,
      tool,
    };
  }

  if (typeof sizeBytes === "number" && tool.processingMode === "cloud") {
    // Limite de tamanho por plano. O caller deve ter passado o tamanho do arquivo.
    const maxMb = maxFileMbForPlan(userPlan);
    if (maxMb !== null && sizeBytes > maxMb * 1024 * 1024) {
      return {
        ok: false,
        code: "FILE_TOO_LARGE",
        status: 413,
        message: "Este arquivo excede o limite do plano atual.",
        upgradeUrl: UPGRADE_URL,
        minimumPlan: userPlan,
        tool,
      };
    }
  }

  return { ok: true, tool };
}

function maxFileMbForPlan(plan: PlanCode): number | null {
  switch (plan) {
    case "ANONYMOUS":
      return 10;
    case "FREE":
      return 20;
    case "PLUS":
      return 250;
    case "PREMIUM":
      return 1024;
    case "ENTERPRISE":
      return null;
  }
}
