import { copyFileSync, existsSync } from "node:fs";
import { prepareDatabaseEnv, runCommand } from "./database-process.mjs";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}

await prepareDatabaseEnv();
runCommand(["npx", "prisma", "generate"]);
runCommand(["npx", "prisma", "migrate", "deploy"]);
runCommand(["npx", "tsx", "prisma/seed.ts"]);
