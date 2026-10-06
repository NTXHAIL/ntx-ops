import { PrismaClient } from "@prisma/client";
import { MISSING_DATABASE_MESSAGE, applyDatabaseEnv, canMigrateDatabase } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const configured = canMigrateDatabase(applyDatabaseEnv());

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Used only when no database URL is set. `connection()` stops `next build` from
 * prerendering queries. At request time the setup page is shown instead.
 */
function unavailablePrisma(): PrismaClient {
  const reject = async () => {
    const { connection } = await import("next/server");
    await connection();
    throw new Error(MISSING_DATABASE_MESSAGE);
  };
  const model = new Proxy(reject, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      return reject;
    },
  });
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      if (prop === "$disconnect" || prop === "$connect" || prop === "$on" || prop === "$extends") {
        return async () => undefined;
      }
      return model;
    },
  });
}

export const prisma = configured
  ? (globalForPrisma.prisma ?? createClient())
  : unavailablePrisma();

if (configured && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
