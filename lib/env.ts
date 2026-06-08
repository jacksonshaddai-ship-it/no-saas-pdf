const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

function readEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function isMockMode() {
  return readBool("USE_MOCK_EXTERNAL", false);
}

const env = {
  nodeEnv: readEnv("NODE_ENV", "development"),
  isProd,
  isTest,
  isMockMode,

  appUrl: readEnv("APP_URL", "http://localhost:3000"),
  databaseUrl: readEnv("DATABASE_URL", "file:./dev.db"),

  nextauthUrl: readEnv("NEXTAUTH_URL", "http://localhost:3000"),
  nextauthSecret: readEnv("NEXTAUTH_SECRET", "dev-secret-not-for-production"),

  cloudconvertApiKey: readEnv("CLOUDCONVERT_API_KEY", ""),
  cloudconvertApiUrl: readEnv("CLOUDCONVERT_API_URL", "https://api.cloudconvert.com/v2"),

  upstashRedisRestUrl: readEnv("UPSTASH_REDIS_REST_URL", ""),
  upstashRedisRestToken: readEnv("UPSTASH_REDIS_REST_TOKEN", ""),

  anonHashSalt: readEnv("ANON_HASH_SALT", "dev-anon-salt"),

  paymentProviderBr: readEnv("PAYMENT_PROVIDER_BR", "mercado_pago"),
  paymentProviderGlobal: readEnv("PAYMENT_PROVIDER_GLOBAL", "stripe"),
  billingSkipWebhookSig: readBool("BILLING_SKIP_WEBHOOK_SIG", false),

  mercadoPagoAccessToken: readEnv("MERCADO_PAGO_ACCESS_TOKEN", ""),
  mercadoPagoWebhookSecret: readEnv("MERCADO_PAGO_WEBHOOK_SECRET", ""),
  mercadoPagoSandbox: readBool("MERCADO_PAGO_SANDBOX", true),

  stripeSecretKey: readEnv("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: readEnv("STRIPE_WEBHOOK_SECRET", ""),
};

export function validateProductionEnv() {
  if (!isProd) return;

  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "APP_URL",
    "ANON_HASH_SALT",
    "CLOUDCONVERT_API_KEY",
    "PAYMENT_PROVIDER_BR",
    "PAYMENT_PROVIDER_GLOBAL",
  ];

  const missing = required.filter((name) => !process.env[name] || process.env[name] === "");
  if (missing.length > 0) {
    throw new Error(
      `[env] Em producao, as seguintes variaveis sao obrigatorias: ${missing.join(", ")}`,
    );
  }

  if (!env.billingSkipWebhookSig) {
    if (env.paymentProviderBr === "mercado_pago" && !env.mercadoPagoWebhookSecret) {
      throw new Error("[env] MERCADO_PAGO_WEBHOOK_SECRET obrigatorio em producao (ou BILLING_SKIP_WEBHOOK_SIG=1).");
    }
    if (env.paymentProviderGlobal === "stripe" && !env.stripeWebhookSecret) {
      throw new Error("[env] STRIPE_WEBHOOK_SECRET obrigatorio em producao (ou BILLING_SKIP_WEBHOOK_SIG=1).");
    }
  }

  if (env.mercadoPagoAccessToken === "" && env.paymentProviderBr === "mercado_pago") {
    throw new Error("[env] MERCADO_PAGO_ACCESS_TOKEN obrigatorio para PAYMENT_PROVIDER_BR=mercado_pago.");
  }
  if (env.stripeSecretKey === "" && env.paymentProviderGlobal === "stripe") {
    throw new Error("[env] STRIPE_SECRET_KEY obrigatorio para PAYMENT_PROVIDER_GLOBAL=stripe.");
  }

  if (env.nextauthSecret === "dev-secret-not-for-production") {
    throw new Error("[env] NEXTAUTH_SECRET nao pode ser o valor padrao de desenvolvimento em producao.");
  }

  if (env.anonHashSalt === "dev-anon-salt") {
    throw new Error("[env] ANON_HASH_SALT nao pode ser o valor padrao de desenvolvimento em producao.");
  }
}

export default env;
export { isMockMode };
