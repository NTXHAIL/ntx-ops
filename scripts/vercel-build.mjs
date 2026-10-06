import { databaseReadyForMigrations, runCommand } from "./database-process.mjs";
import { tsImport } from "tsx/esm/api";

const ready = await databaseReadyForMigrations();
runCommand(["npx", "prisma", "generate"]);
if (!ready) {
  const { MIGRATION_SKIP_MESSAGE } = await tsImport("../src/lib/database-url.ts", import.meta.url);
  console.log(MIGRATION_SKIP_MESSAGE);
} else {
  runCommand(["npx", "prisma", "migrate", "deploy"]);
  runCommand(["npx", "tsx", "prisma/seed.ts"]);
}
runCommand(["npx", "next", "build"]);
