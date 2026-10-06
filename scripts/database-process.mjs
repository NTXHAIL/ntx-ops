import { spawnSync } from "node:child_process";
import { tsImport } from "tsx/esm/api";

export async function prepareDatabaseEnv() {
  const { assertDatabaseEnv } = await tsImport("../src/lib/database-url.ts", import.meta.url);
  try {
    assertDatabaseEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
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
