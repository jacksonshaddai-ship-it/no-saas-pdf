export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  try {
    const { validateProductionEnv } = await import("./lib/env");
    validateProductionEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[env] ${message}`);
    if (process.env.ENFORCE_PROD_ENV === "1") {
      throw error;
    }
  }
}
