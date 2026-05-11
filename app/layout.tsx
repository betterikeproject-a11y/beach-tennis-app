import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liga Jurerê Beach Sports",
  description: "Gerenciador de torneios de beach tennis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <header className="border-b px-4 py-3 bg-white sticky top-0 z-40 shadow-sm">
          <a href="/" className="flex items-center gap-2.5">
            <Image src="/logo.jpeg" alt="Jurerê Beach Sports" width={36} height={36} className="rounded-full" />
            <span className="font-bold text-base text-brand tracking-tight leading-tight">
              Liga Jurerê Beach Sports
            </span>
          </a>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
