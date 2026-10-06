import { loadEnvConfig } from "@next/env";

/**
 * Connection strings the Vercel Neon integration injects.
 * Current docs (Neon Vercel-managed integration): DATABASE_URL is pooled,
 * DATABASE_URL_UNPOOLED is direct. POSTGRES_PRISMA_URL and
 * POSTGRES_URL_NON_POOLING are the older Vercel Postgres names, still set
 * for compatibility. DIRECT_URL is only a local fallback when no unpooled
 * variable is present.
 */
const POOLED_ENV_NAMES = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"] as const;
const DIRECT_ENV_NAMES = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DIRECT_URL",
] as const;

export const MISSING_DATABASE_MESSAGE =
  "Database is not configured. In the Vercel project, open the Storage tab, create a Neon Postgres database, and connect it to this project so DATABASE_URL and DATABASE_URL_UNPOOLED are set. Then redeploy. On your computer, set DATABASE_URL in .env. DATABASE_URL_UNPOOLED can be the same address.";

export const MIGRATION_SKIP_MESSAGE = [
  "No database URL found (looked for DATABASE_URL, POSTGRES_PRISMA_URL, and POSTGRES_URL).",
  "Skipping prisma migrate deploy and the demo seed.",
  "The site will still deploy. Opening it shows how to connect Neon Postgres from the Vercel Storage tab, connect a Blob store, and add AUTH_SECRET.",
  "After those are connected, redeploy so the tables and demo shop are created.",
].join("\n");

export type DatabaseUrls = {
  pooled: string | undefined;
  direct: string | undefined;
};

type EnvLike = Record<string, string | undefined>;

let envFilesLoaded = false;

function readEnv(env: EnvLike, name: string) {
  const value = env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstEnv(env: EnvLike, names: readonly string[]) {
  for (const name of names) {
    const value = readEnv(env, name);
    if (value) return value;
  }
  return undefined;
}

function hasParam(connectionString: string, key: string) {
  return new RegExp(`(?:[?&])${key}=`, "i").test(connectionString);
}

function withParam(connectionString: string, key: string, value: string) {
  if (hasParam(connectionString, key)) return connectionString;
  const joiner = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${joiner}${key}=${value}`;
}

function isPooledConnection(connectionString: string) {
  const withoutProtocol = connectionString.replace(/^[a-z+]+:\/\//i, "");
  const at = withoutProtocol.lastIndexOf("@");
  const hostAndRest = at >= 0 ? withoutProtocol.slice(at + 1) : withoutProtocol;
  const hostPort = (hostAndRest.split("/")[0] ?? "").toLowerCase();
  if (hostPort.includes("pooler")) return true;
  const port = hostPort.includes(":") ? hostPort.slice(hostPort.lastIndexOf(":") + 1) : "";
  return port === "6543";
}

/** Prisma talks to PgBouncer with prepared statements disabled and one connection. */
export function withPrismaPoolParams(connectionString: string) {
  const pooled = isPooledConnection(connectionString) || hasParam(connectionString, "pgbouncer");
  if (!pooled) return connectionString;
  let next = connectionString;
  if (!hasParam(next, "pgbouncer")) next = withParam(next, "pgbouncer", "true");
  if (!hasParam(next, "connection_limit")) next = withParam(next, "connection_limit", "1");
  return next;
}

export function resolveDatabaseUrls(env: EnvLike = process.env): DatabaseUrls {
  const pooledRaw = firstEnv(env, POOLED_ENV_NAMES);
  const directRaw = firstEnv(env, DIRECT_ENV_NAMES) ?? pooledRaw;
  return {
    pooled: pooledRaw ? withPrismaPoolParams(pooledRaw) : undefined,
    direct: directRaw,
  };
}

function loadProjectEnv() {
  if (envFilesLoaded) return;
  envFilesLoaded = true;
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}

export function applyDatabaseEnv(env: NodeJS.ProcessEnv = process.env): DatabaseUrls {
  if (env === process.env) loadProjectEnv();
  const resolved = resolveDatabaseUrls(env);
  if (resolved.pooled) env.DATABASE_URL = resolved.pooled;
  if (resolved.direct) env.DATABASE_URL_UNPOOLED = resolved.direct;
  return resolved;
}

export function canMigrateDatabase(resolved: DatabaseUrls) {
  return Boolean(resolved.pooled && resolved.direct);
}

export function hasPooledDatabaseUrl(env: EnvLike = process.env) {
  return Boolean(firstEnv(env, POOLED_ENV_NAMES));
}

export function databaseReady(env: EnvLike = process.env) {
  if (env === process.env) applyDatabaseEnv();
  return hasPooledDatabaseUrl(env);
}

export function assertDatabaseEnv(env: NodeJS.ProcessEnv = process.env): DatabaseUrls {
  const resolved = applyDatabaseEnv(env);
  if (!canMigrateDatabase(resolved)) {
    throw new Error(MISSING_DATABASE_MESSAGE);
  }
  return resolved;
}

export function databaseConfigured(env: EnvLike = process.env) {
  const resolved = env === process.env ? applyDatabaseEnv() : resolveDatabaseUrls(env);
  return canMigrateDatabase(resolved);
}
