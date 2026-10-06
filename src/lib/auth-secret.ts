const PLACEHOLDER = "replace-with-a-long-random-string";
const MIN_PRODUCTION_LENGTH = 32;

const WHERE =
  "In the Vercel project, open Settings → Environment Variables, set AUTH_SECRET to a random string of at least 32 characters, then redeploy. Generate one at https://generate-secret.vercel.app/32.";

export function productionAuthSecretError(value = process.env["AUTH_SECRET"]): string | null {
  const secret = value?.trim() ?? "";
  if (!secret) return `AUTH_SECRET is missing. ${WHERE}`;
  if (secret === PLACEHOLDER) {
    return `AUTH_SECRET is still the example placeholder from .env.example. ${WHERE}`;
  }
  if (secret.length < MIN_PRODUCTION_LENGTH) {
    return `AUTH_SECRET is too short (${secret.length} characters). ${WHERE}`;
  }
  return null;
}

export function isAuthSecretError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith("AUTH_SECRET");
}

export function authSecretKey() {
  if (process.env.NODE_ENV === "production") {
    const problem = productionAuthSecretError();
    if (problem) throw new Error(problem);
  }
  const value = process.env["AUTH_SECRET"]?.trim();
  const usable = Boolean(value && value !== PLACEHOLDER && value.length >= 16);
  return new TextEncoder().encode(usable && value ? value : "dev-insecure-hail-ops-secret");
}
