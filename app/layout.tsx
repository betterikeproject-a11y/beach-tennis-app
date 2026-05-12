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
          <header className="border-b px-4 py-3 bg-white sticky top-0 z-40 shadow-sm relative">
            <div className="flex justify-center max-w-4xl mx-auto relative">
              <a href="/" className="flex flex-col items-center gap-1.5 py-1">
                <Image src="/logo.jpeg" alt="Jurerê Beach Sports" width={44} height={44} className="rounded-full shadow-sm" />
                <span className="font-bold text-base text-brand tracking-tight leading-tight text-center">
                  Liga Jurerê Beach Sports
                </span>
              </a>
            </div>
            <div className="absolute top-3 right-4">
              <LoginDialog />
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
