// ===========================================================================
// Configuracao central de planos
// Fonte unica de verdade. O backend checa:
//   1. status da ferramenta (implemented / coming_soon)
//   2. minimumPlan vs plano do usuario
//   3. dailyLimit / monthlyLimit / maxFileMb
//   4. cloudCreditsMonthly (preparado para Fase 5)
// A pagina /pricing NAO deve mostrar limites tecnicos exatos do Basico.
// ===========================================================================

export type PlanCode = "ANONYMOUS" | "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE";

export type PlanPrice = {
  BRL: { monthly: number | null; yearly: number | null };
  USD: { monthly: number | null; yearly: number | null };
};

export type PlanDefinition = {
  code: PlanCode;
  rank: number;
  label: string;
  publicLabel: string;
  tagline: string;
  publicPrice: string;
  price: PlanPrice | null;
  // Limites tecnicos. `null` = custom (Enterprise) ou nao aplicavel.
  dailyLimit: number | null;
  monthlyLimit: number | null;
  maxFileMb: number | null;
  // Preparado para Fase 5 (creditos de provedor externo).
  cloudCreditsMonthly: number | null;
  // Vantagens publicas (mostradas em /pricing).
  publicFeatures: string[];
  // Tooltip interno (debug/admin).
  internalNotes?: string;
  // Cor de destaque usada em cards.
  accent: "slate" | "emerald" | "indigo" | "red" | "violet";
  // Destaque do plano em /pricing.
  highlight?: boolean;
};

const RANK: Record<PlanCode, number> = {
  ANONYMOUS: 0,
  FREE: 1,
  PLUS: 2,
  PREMIUM: 3,
  ENTERPRISE: 4,
};

export const PLANS: Record<PlanCode, PlanDefinition> = {
  ANONYMOUS: {
    code: "ANONYMOUS",
    rank: RANK.ANONYMOUS,
    label: "Básico",
    publicLabel: "Uso grátis limitado",
    tagline: "Para experimentar sem cadastro.",
    publicPrice: "Grátis",
    price: null,
    dailyLimit: 3,
    monthlyLimit: null,
    maxFileMb: 10,
    cloudCreditsMonthly: null,
    publicFeatures: [
      "Ferramentas essenciais",
      "Processamento limitado por dia",
      "Ideal para experimentar",
    ],
    accent: "slate",
  },
  FREE: {
    code: "FREE",
    rank: RANK.FREE,
    label: "Básico",
    publicLabel: "Conta grátis",
    tagline: "Para uso pessoal, com cadastro.",
    publicPrice: "Grátis",
    price: null,
    dailyLimit: 5,
    monthlyLimit: 30,
    maxFileMb: 20,
    cloudCreditsMonthly: null,
    publicFeatures: [
      "Ferramentas essenciais",
      "Cota diária e mensal mais confortável",
      "Histórico de operações no painel",
      "Sem anúncios",
    ],
    accent: "emerald",
    highlight: true,
  },
  PLUS: {
    code: "PLUS",
    rank: RANK.PLUS,
    label: "Plus",
    publicLabel: "Plus",
    tagline: "Para quem precisa de mais conversões e ferramentas.",
    publicPrice: "R$ 14,90 / mês",
    price: {
      BRL: { monthly: 14.9, yearly: 89.9 },
      USD: { monthly: 2.99, yearly: 17.99 },
    },
    dailyLimit: 30,
    monthlyLimit: 300,
    maxFileMb: 250,
    cloudCreditsMonthly: 50,
    publicFeatures: [
      "Ferramentas básicas e intermediárias",
      "Arquivos até 250 MB",
      "Mais créditos de nuvem por mês",
      "Conversões em lote pequenas",
    ],
    accent: "indigo",
  },
  PREMIUM: {
    code: "PREMIUM",
    rank: RANK.PREMIUM,
    label: "Premium",
    publicLabel: "Premium",
    tagline: "Para uso intenso e ferramentas avançadas.",
    publicPrice: "R$ 24,90 / mês",
    price: {
      BRL: { monthly: 24.9, yearly: 149.9 },
      USD: { monthly: 4.99, yearly: 29.99 },
    },
    dailyLimit: 200,
    monthlyLimit: 2000,
    maxFileMb: 1024,
    cloudCreditsMonthly: 200,
    publicFeatures: [
      "Todas as ferramentas principais",
      "Arquivos grandes (até 1 GB)",
      "OCR avançado e conversões com OCR",
      "Sem anúncios",
      "Suporte preferencial",
    ],
    accent: "red",
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    rank: RANK.ENTERPRISE,
    label: "Enterprise",
    publicLabel: "Empresarial",
    tagline: "Para times, alto volume e contrato dedicado.",
    publicPrice: "Sob consulta",
    price: null,
    dailyLimit: null,
    monthlyLimit: null,
    maxFileMb: null,
    cloudCreditsMonthly: null,
    publicFeatures: [
      "Todas as ferramentas disponíveis",
      "Limites personalizados e SLA",
      "Gestão de equipe e SSO",
      "API dedicada e integrações",
      "Suporte dedicado",
    ],
    accent: "violet",
  },
};

// ===========================================================================
// Helpers
// ===========================================================================

export const PLAN_ORDER: PlanCode[] = ["ANONYMOUS", "FREE", "PLUS", "PREMIUM", "ENTERPRISE"];

export function getPlan(code: PlanCode): PlanDefinition {
  return PLANS[code];
}

/** Compara se `actual` cobre `required`. */
export function planCovers(actual: PlanCode, required: PlanCode): boolean {
  return PLANS[actual].rank >= PLANS[required].rank;
}

export function isAnonymous(code: PlanCode): boolean {
  return code === "ANONYMOUS";
}

export function isPaidPlan(code: PlanCode): boolean {
  return code === "PLUS" || code === "PREMIUM" || code === "ENTERPRISE";
}

// Mapeia o planCode armazenado no User (FREE | PREMIUM | BUSINESS historico)
// para o novo PlanCode da Fase 4. Mantem compatibilidade.
export function normalizeUserPlan(planCode: string | null | undefined): "FREE" | "PREMIUM" {
  if (planCode === "PREMIUM" || planCode === "BUSINESS") return "PREMIUM";
  return "FREE";
}
