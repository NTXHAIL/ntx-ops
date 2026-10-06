import { prepareDatabaseEnv, runCommand } from "./database-process.mjs";

await prepareDatabaseEnv();
runCommand(["npx", "prisma", "generate"]);
runCommand(["npx", "prisma", "migrate", "deploy"]);
runCommand(["npx", "tsx", "prisma/seed.ts"]);
runCommand(["npx", "next", "build"]);
