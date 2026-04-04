"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminStockRealtimeAlerts from "@/components/AdminStockRealtimeAlerts";
import HeaderMobile from "@/components/HeaderMobile";
import Sidebar from "@/components/Sidebar";
import { useSegment } from "@/hooks/useSegment";
import { isAccountantRole } from "@/lib/roles";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
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
  const isPublicStandalonePage =
    pathname === "/" ||
    pathname === "/privacidade" ||
    pathname === "/termos" ||
    pathname === "/suporte";
  const isCheckoutPage = pathname.startsWith("/checkout");
  const isSetupPage = pathname === "/setup";
  const shouldResolveSegment =
    !isAuthPage && !isPublicStandalonePage && !isCheckoutPage;
  const { isReady, isAuthenticated, hasSegment, isDeveloper, showOS, role } = useSegment({
    enabled: shouldResolveSegment,
  });
  const isDeveloperBypass = isDeveloper && !hasSegment;
  const isServicePath = pathname.startsWith("/os") || pathname.startsWith("/consulta");
  const isAccountant = isAccountantRole(role);
  const isAccountantPortalPath = pathname.startsWith("/configuracoes/contador");

  useEffect(() => {
    if (!shouldResolveSegment || !isReady) {
      return;
    }

    // Don't redirect from home page to login for unauthenticated users
    if (!isAuthenticated && pathname !== "/") {
      router.replace("/login");
      return;
    }

    if (isSetupPage && hasSegment) {
      router.replace("/dashboard");
      return;
    }

    if (!isSetupPage && !hasSegment && !isDeveloperBypass) {
      router.replace("/setup");
      return;
    }

    if (!isSetupPage && isAccountant && !isAccountantPortalPath) {
      router.replace("/configuracoes/contador?access=restricted");
      return;
    }

    if (!isSetupPage && hasSegment && isServicePath && !showOS && !isDeveloperBypass) {
      router.replace("/dashboard");
    }
  }, [
    isAccountant,
    isAccountantPortalPath,
    hasSegment,
    isAuthenticated,
    isDeveloperBypass,
    isServicePath,
    isReady,
    isSetupPage,
    router,
    showOS,
    shouldResolveSegment,
    pathname,
  ]);

  const shouldHoldContent =
    shouldResolveSegment &&
    (!isReady ||
      !isAuthenticated ||
      (isSetupPage ? hasSegment : !hasSegment && !isDeveloperBypass) ||
      (!isSetupPage && isAccountant && !isAccountantPortalPath) ||
      (!isSetupPage && hasSegment && isServicePath && !showOS && !isDeveloperBypass));

  if (shouldHoldContent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050c1a] px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#FACC15]/20 bg-[#0B1121]/90 p-8 text-center shadow-[0_0_40px_rgba(250,204,21,0.08)] backdrop-blur-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#FACC15]/20 border-t-[#FACC15]" />
          <p className="text-sm font-medium tracking-[0.24em] text-[#FACC15]">
            WORLD TECH
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Preparando sua interface
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Estamos carregando o perfil da empresa e direcionando voce para a
            experiencia correta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050c1a]">
      {/* Fluxo sem sidebar */}
      {isAuthPage ? (
        <main className="w-full h-screen flex items-center justify-center">
          {children}
        </main>
      ) : isPublicStandalonePage ? (
        <main className="w-full min-h-screen">{children}</main>
      ) : isCheckoutPage ? (
        <main className="w-full min-h-screen">{children}</main>
      ) : isSetupPage ? (
        <main className="w-full min-h-screen">{children}</main>
      ) : (
        /* Páginas internas com sidebar */
        <div className="min-h-screen">
          <AdminStockRealtimeAlerts />
          <HeaderMobile onOpenMenu={handleOpenMobileMenu} />
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobileMenu={handleCloseMobileMenu}
          />
          <main className="min-w-0 overflow-x-hidden pt-20 md:h-screen md:overflow-y-auto md:pl-64 md:pt-8">
            <div className="px-4 pb-6 pl-0 sm:px-5 md:px-8 md:pb-8">
              {isDeveloperBypass ? (
                <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 shadow-[0_0_18px_rgba(250,204,21,0.08)]">
                  MODO DESENVOLVEDOR
                </div>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
