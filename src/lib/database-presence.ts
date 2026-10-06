/** Pooled URL names injected by the Vercel Neon integration, oldest name last. */
export const POOLED_DATABASE_ENV_NAMES = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"] as const;

export function hasPooledDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  return POOLED_DATABASE_ENV_NAMES.some((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}
