import { describe, expect, it } from "vitest";
import { resolveDatabaseUrls, withPrismaPoolParams } from "@/lib/database-url";

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
