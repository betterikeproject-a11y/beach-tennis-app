import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/AuthProvider";
import { LoginDialog } from "@/components/LoginDialog";
import { Toaster } from "@/components/ui/sonner";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liga Jurerê Beach Sports",
  description: "Gerenciador de torneios de beach tennis",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_token")?.value === "true";
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <AuthProvider isAdmin={isAdmin}>
          <header className="border-b px-4 py-3 bg-white sticky top-0 z-40 shadow-sm">
            <div className="flex items-center justify-between max-w-[1600px] w-full mx-auto">
              <a href="/" className="flex items-center gap-3">
                <Image src="/logo.jpeg" alt="Jurerê Beach Sports" width={44} height={44} className="rounded-full shadow-sm" />
                <span className="font-bold text-lg text-brand tracking-tight">
                  Liga Jurerê Beach Sports
                </span>
              </a>
              <LoginDialog />
            </div>
          </header>
          <main className="max-w-[1600px] w-full mx-auto px-4 py-6">{children}</main>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
