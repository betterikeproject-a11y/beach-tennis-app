"use server";

import { cookies } from "next/headers";

export async function loginAction(password: string) {
  if (password === "ligajuscbt2026") {
    (await cookies()).set("admin_token", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return { success: true };
  }
  return { success: false, error: "Senha incorreta" };
}

export async function logoutAction() {
  (await cookies()).delete("admin_token");
}
