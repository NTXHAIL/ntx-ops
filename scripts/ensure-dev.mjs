import { copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}

execSync("npx prisma generate", { stdio: "inherit" });
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
