import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import type { Role } from "@prisma/client";

export { SESSION_COOKIE };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function secret() {
  const value = process.env.AUTH_SECRET?.trim();
  const placeholder = "replace-with-a-long-random-string";
  const usable = Boolean(value && value !== placeholder && value.length >= 16);
  if (process.env.NODE_ENV === "production" && !usable) {
    throw new Error("Set AUTH_SECRET to a long random string before deploying.");
  }
  return new TextEncoder().encode(usable && value ? value : "dev-insecure-hail-ops-secret");
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

async function readSessionToken() {
  const jar = await cookies();
  const fromStore = jar.get(SESSION_COOKIE)?.value;
  if (fromStore) return fromStore;

  const raw = (await headers()).get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role === "ADMIN" ? "ADMIN" : "ESTIMATOR",
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  await createSession(session);
  return session;
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
