"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import HeaderMobile from "@/components/HeaderMobile";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const handleOpenMobileMenu = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);
  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

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
          <HeaderMobile onOpenMenu={handleOpenMobileMenu} />
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobileMenu={handleCloseMobileMenu}
          />
          <main className="min-w-0 overflow-x-hidden pt-20 md:h-screen md:overflow-y-auto md:pl-64 md:pt-8">
            <div className="px-4 pb-6 pl-0 sm:px-5 md:px-8 md:pb-8">
              {children}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
