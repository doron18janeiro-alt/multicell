import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  applicationName: "World Tech Manager",
  title: "World Tech Manager",
  description: "World Tech Manager - Gestão Inteligente",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-wtm.png",
    shortcut: "/logo-wtm.png",
    apple: "/logo-wtm.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "World Tech Manager",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
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
