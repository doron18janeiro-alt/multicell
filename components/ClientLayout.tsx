"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define se a página atual é de autenticação
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/recuperar" ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/reset-password");
  const isCheckoutPage = pathname.startsWith("/checkout");

  return (
    <div className="min-h-screen bg-[#050c1a]">
      {/* Fluxo sem sidebar */}
      {isAuthPage ? (
        <main className="w-full h-screen flex items-center justify-center">
          {children}
        </main>
      ) : isCheckoutPage ? (
        <main className="w-full min-h-screen">{children}</main>
      ) : (
        /* Páginas internas com sidebar */
        <div className="min-h-screen">
          <Sidebar />
          <main className="min-w-0 overflow-x-hidden px-4 pb-6 pt-20 sm:px-5 md:ml-64 md:h-screen md:overflow-y-auto md:px-8 md:pb-8 md:pt-8">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
