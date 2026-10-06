"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { isAuthSecretError } from "@/lib/auth-secret";
import { clearSession, loginWithPassword } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  let user: Awaited<ReturnType<typeof loginWithPassword>>;
  try {
    user = await loginWithPassword(email, password);
  } catch (error) {
    unstable_rethrow(error);
    if (isAuthSecretError(error)) {
      redirect(`/login?config=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  if (!user) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
