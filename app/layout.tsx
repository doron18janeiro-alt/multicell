import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MULTICELL - Sistema de Gestão",
  description: "Sistema de gestão para assistência técnica e vendas",
  manifest: "/manifest.json",
  themeColor: "#0A192F",
  viewport:
    "minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-[#0A192F]`}>
        <KeyboardShortcuts />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen bg-[#0A192F]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
