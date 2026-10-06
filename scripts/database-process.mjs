import { spawnSync } from "node:child_process";
import { tsImport } from "tsx/esm/api";

async function databaseModule() {
  return tsImport("../src/lib/database-url.ts", import.meta.url);
}

export async function prepareDatabaseEnv() {
  const { assertDatabaseEnv } = await databaseModule();
  try {
    assertDatabaseEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/** True when a pooled URL is set. A missing URL should skip migrate/seed, not fail the Vercel build. */
export async function databaseReadyForMigrations() {
  const { applyDatabaseEnv, databaseReady } = await databaseModule();
  applyDatabaseEnv();
  return databaseReady();
}

export function runCommand(args) {
  if (!args.length) {
    console.error("Missing command.");
    process.exit(1);
  }
  const result = spawnSync(args[0], args.slice(1), {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
