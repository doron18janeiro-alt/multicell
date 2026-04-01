import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://multicellsystem.com.br"),
  title: "MULTICELL - Sistema de Gestão",
  description: "Sistema de gestão para assistência técnica e vendas",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A192F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-[#050c1a]`}>
        <KeyboardShortcuts />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
