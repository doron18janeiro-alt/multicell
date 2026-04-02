"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Search,
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Users,
  Package,
  Settings,
  Smartphone,
  LogOut,
  BarChart3,
  Wallet,
  X,
} from "lucide-react";
import { resetSegmentSessionCache, useSegment } from "@/hooks/useSegment";

type SidebarProps = {
  isMobileOpen: boolean;
  onCloseMobileMenu: () => void;
};

export default function Sidebar({
  isMobileOpen,
  onCloseMobileMenu,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);
  const { showOS, fullName, role } = useSegment();

  useEffect(() => {
    onCloseMobileMenu();
  }, [onCloseMobileMenu, pathname]);

  useEffect(() => {
    const checkAlerts = () => {
      fetch("/api/stock/alerts")
        .then(async (res) => {
          if (!res.ok) {
            setAlertCount(0);
            return null;
          }

          return res.json();
        })
        .then((data) => {
          if (!data) return;
          setAlertCount(Number(data.count || 0));
        })
        .catch((err) => console.error(err));
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
    } finally {
      resetSegmentSessionCache();
      router.push("/login");
      router.refresh();
    }
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Vendas / PDV", icon: ShoppingCart, path: "/vendas" },
    ...(showOS
      ? [{ name: "Ordens de Serviço", icon: Wrench, path: "/os/novo" }]
      : []),
    { name: "Clientes", icon: Users, path: "/clientes" },
    ...(showOS
      ? [{ name: "Consulta Garantia", icon: Search, path: "/consulta" }]
      : []),
    { name: "Estoque", icon: Package, path: "/estoque" },
    { name: "Financeiro", icon: Wallet, path: "/financeiro" },
    { name: "Relatórios", icon: BarChart3, path: "/relatorios" },
    { name: "Minha Empresa", icon: Building2, path: "/configuracoes/empresa" },
    { name: "Configurações", icon: Settings, path: "/configuracoes" },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (
      role === "ATTENDANT" &&
      (
        item.path === "/financeiro" ||
        item.path === "/configuracoes" ||
        item.path === "/configuracoes/empresa" ||
        item.path === "/relatorios"
      )
    ) {
      return false;
    }

    if (
      !role &&
      (
        item.path === "/financeiro" ||
        item.path === "/configuracoes" ||
        item.path === "/configuracoes/empresa" ||
        item.path === "/relatorios"
      )
    ) {
      return false;
    }

    return true;
  });

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onCloseMobileMenu}
          className="fixed inset-0 z-[55] bg-black/65 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen w-[80vw] max-w-sm flex-col border-r border-[#1E293B]/50 bg-[#0B1121]/95 shadow-2xl backdrop-blur-md transition-transform duration-300 md:z-50 md:w-64 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-[#1E293B]/50 px-4 py-4 md:hidden">
          <Image
            src="/logo.png"
            alt="Multicell"
            width={150}
            height={44}
            priority
            className="h-10 w-auto drop-shadow-md"
          />
          <button
            type="button"
            onClick={onCloseMobileMenu}
            aria-label="Fechar menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E293B] bg-[#0F172A]/80 text-slate-100 transition-colors hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="hidden border-b border-[#1E293B]/50 bg-linear-to-b from-[#0F172A] to-transparent p-6 md:flex md:justify-center">
          <Image
            src="/logo.png"
            alt="Multicell"
            width={180}
            height={56}
            priority
            className="h-14 w-auto drop-shadow-md"
          />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-700">
          {visibleMenuItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path !== "/dashboard" && pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onCloseMobileMenu}
                className={`
                  group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 transition-all duration-300
                  ${
                    isActive
                      ? "border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.05)]"
                      : "text-slate-400 hover:translate-x-1 hover:bg-[#1E293B]/50 hover:text-white"
                  }
                `}
              >
                <item.icon
                  size={20}
                  strokeWidth={1.5}
                  className={`transition-colors duration-300 ${
                    isActive ? "text-[#D4AF37]" : "group-hover:text-[#D4AF37]"
                  }`}
                />
                <span className="z-10 text-sm font-medium tracking-wide">
                  {item.name}
                </span>

                {item.name === "Estoque" && alertCount > 0 && (
                  <span className="z-10 ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                    {alertCount}
                  </span>
                )}

                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />

                {isActive && (
                  <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#1E293B]/50 bg-[#0F172A]/30 p-4">
          <div className="group flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#0F172A]/50 p-3 transition-colors hover:border-[#D4AF37]/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">
              <Smartphone size={18} strokeWidth={1.5} />
            </div>
              <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white transition-colors group-hover:text-[#D4AF37]">
                {fullName || "Usuário"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {role === "ATTENDANT"
                  ? "Atendente"
                  : "Administrador"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
