export const SESSION_COOKIE = "hailops_session";

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.VERCEL === "1" || process.env.NODE_ENV === "production",
    maxAge,
  };
}
