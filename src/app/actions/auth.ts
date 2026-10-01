"use server";

import { redirect } from "next/navigation";
import { clearSession, loginWithPassword } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  const user = await loginWithPassword(email, password);
  if (!user) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
