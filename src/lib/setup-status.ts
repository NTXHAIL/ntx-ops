import { productionAuthSecretError } from "@/lib/auth-secret";
import { databaseConfigured } from "@/lib/database-url";

export type SetupStep = {
  title: string;
  detail: string;
};

export function describeSetup(input: {
  database: boolean;
  authMessage: string | null;
  blob: boolean;
}): SetupStep[] | null {
  if (input.database) return null;
  const steps: SetupStep[] = [
    {
      title: "Delete old Supabase variables",
      detail:
        "In Settings → Environment Variables, delete DATABASE_URL, DIRECT_URL, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY if they are still listed from Supabase. Do this before you connect Neon, so the old values are not left in place. If Neon is already connected, do not delete the variables it just added.",
    },
    {
      title: "Connect Neon Postgres",
      detail:
        "In the Vercel project, open the Storage tab, create a Neon Postgres database, and connect it to this project. Neon sets DATABASE_URL and DATABASE_URL_UNPOOLED for you.",
    },
    {
      title: "Connect a Blob store",
      detail: input.blob
        ? "A Blob store is already connected."
        : "In Storage, create a Blob store and connect it to this project. That sets BLOB_READ_WRITE_TOKEN so photos can be saved.",
    },
    {
      title: "Add AUTH_SECRET",
      detail:
        input.authMessage ??
        "AUTH_SECRET is already set. Leave that variable in place.",
    },
    {
      title: "Redeploy",
      detail:
        "Open Deployments and redeploy. The new deploy creates the tables and the demo shop. Until then, this page stays up.",
    },
  ];
  return steps;
}

function blobConfigured() {
  return Boolean(
    process.env["BLOB_READ_WRITE_TOKEN"]?.trim() || process.env["BLOB_STORE_ID"]?.trim(),
  );
}

/** Steps to show instead of the app when the database is not connected. */
export function setupSteps(): SetupStep[] | null {
  return describeSetup({
    database: databaseConfigured(),
    authMessage: process.env.NODE_ENV === "production" ? productionAuthSecretError() : null,
    blob: blobConfigured(),
  });
}
