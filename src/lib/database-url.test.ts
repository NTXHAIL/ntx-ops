import { describe, expect, it } from "vitest";
import { hasPooledDatabaseUrl as hasPooledDatabaseUrlInProxy } from "@/lib/database-presence";
import {
  MIGRATION_SKIP_MESSAGE,
  canMigrateDatabase,
  hasPooledDatabaseUrl,
  resolveDatabaseUrls,
  withPrismaPoolParams,
} from "@/lib/database-url";

const POOLED =
  "postgresql://user:p%40ss@ep-abc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const DIRECT =
  "postgresql://user:p%40ss@ep-abc.us-east-1.aws.neon.tech/neondb?sslmode=require";

describe("resolveDatabaseUrls", () => {
  it("uses the Neon pooled and direct variables", () => {
    const resolved = resolveDatabaseUrls({
      DATABASE_URL: POOLED,
      DATABASE_URL_UNPOOLED: DIRECT,
      POSTGRES_PRISMA_URL: "postgresql://ignored",
      POSTGRES_URL_NON_POOLING: "postgresql://ignored-direct",
      DIRECT_URL: "postgresql://old-supabase",
    });
    expect(resolved.pooled).toBe(`${POOLED}&pgbouncer=true&connection_limit=1`);
    expect(resolved.direct).toBe(DIRECT);
  });

  it("tolerates the older Vercel Postgres variable names", () => {
    const resolved = resolveDatabaseUrls({
      POSTGRES_PRISMA_URL: "postgresql://user:pw@db.example.com:6543/verceldb?pgbouncer=true",
      POSTGRES_URL_NON_POOLING: "postgresql://user:pw@db.example.com:5432/verceldb",
    });
    expect(resolved.pooled).toBe(
      "postgresql://user:pw@db.example.com:6543/verceldb?pgbouncer=true&connection_limit=1",
    );
    expect(resolved.direct).toBe("postgresql://user:pw@db.example.com:5432/verceldb");
  });

  it("uses DIRECT_URL only when no unpooled variable is set", () => {
    const local = "postgresql://hailops:hailops@localhost:5432/hailops?schema=public";
    const resolved = resolveDatabaseUrls({
      DATABASE_URL: local,
      DIRECT_URL: local,
    });
    expect(resolved.pooled).toBe(local);
    expect(resolved.direct).toBe(local);
  });

  it("copies the pooled URL when a direct URL is missing", () => {
    const local = "postgresql://hailops:hailops@localhost:5432/hailops";
    expect(resolveDatabaseUrls({ DATABASE_URL: local })).toEqual({
      pooled: local,
      direct: local,
    });
  });

  it("does not migrate when the database URL is missing", () => {
    expect(canMigrateDatabase(resolveDatabaseUrls({}))).toBe(false);
    expect(
      canMigrateDatabase(resolveDatabaseUrls({ DATABASE_URL: "  ", DIRECT_URL: "postgresql://old" })),
    ).toBe(false);
    expect(
      canMigrateDatabase(resolveDatabaseUrls({ DIRECT_URL: "postgresql://old-supabase" })),
    ).toBe(false);
  });

  it("migrates when a pooled URL is set", () => {
    const local = "postgresql://hailops:hailops@localhost:5432/hailops";
    expect(canMigrateDatabase(resolveDatabaseUrls({ DATABASE_URL: local }))).toBe(true);
  });
});

describe("hasPooledDatabaseUrl", () => {
  it("matches the proxy check, including a missing or blank URL", () => {
    const cases = [
      {},
      { DATABASE_URL: "  " },
      { DIRECT_URL: "postgresql://old" },
      { DATABASE_URL: "postgresql://db/app" },
      { POSTGRES_PRISMA_URL: "postgresql://db/app" },
      { POSTGRES_URL: "postgresql://db/app" },
    ];
    for (const env of cases) {
      expect(hasPooledDatabaseUrl(env)).toBe(hasPooledDatabaseUrlInProxy(env));
    }
  });
});

describe("migration skip message", () => {
  it("says the deploy continues and names the Neon variables", () => {
    expect(MIGRATION_SKIP_MESSAGE).toContain("Skipping prisma migrate deploy");
    expect(MIGRATION_SKIP_MESSAGE).toContain("DATABASE_URL");
    expect(MIGRATION_SKIP_MESSAGE).toContain("redeploy");
  });
});

describe("withPrismaPoolParams", () => {
  it("leaves a local Postgres URL unchanged", () => {
    const local = "postgresql://hailops:hailops@localhost:5432/hailops?schema=public";
    expect(withPrismaPoolParams(local)).toBe(local);
  });

  it("does not duplicate pool parameters", () => {
    const already = `${POOLED}&pgbouncer=true&connection_limit=1`;
    expect(withPrismaPoolParams(already)).toBe(already);
  });
});
