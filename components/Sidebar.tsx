"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Users,
  Package,
  Settings,
  Smartphone,
  LogOut,
  BarChart3,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const checkAlerts = () => {
      fetch("/api/stock/alerts")
        .then((res) => res.json())
        .then((data) => setAlertCount(data.count))
        .catch((err) => console.error(err));
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Vendas / PDV", icon: ShoppingCart, path: "/vendas" },
    { name: "Ordens de Serviço", icon: Wrench, path: "/os/novo" },
    { name: "Clientes", icon: Users, path: "/clientes" },
    { name: "Estoque", icon: Package, path: "/estoque" },
    { name: "Configurações", icon: Settings, path: "/configuracoes" },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0B1121]/95 backdrop-blur-md border-r border-[#1E293B]/50 flex flex-col fixed left-0 top-0 z-50 shadow-2xl transition-all duration-300">
      {/* Logo Area */}
      <div className="p-6 mb-2 flex justify-center border-b border-[#1E293B]/50 bg-gradient-to-b from-[#0F172A] to-transparent">
        <img
          src="/logo.png"
          alt="Multicell"
          className="h-14 w-auto drop-shadow-md"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/dashboard" && pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden
                ${
                  isActive
                    ? "bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.05)] border border-[#D4AF37]/20"
                    : "text-slate-400 hover:text-white hover:bg-[#1E293B]/50 hover:translate-x-1"
                }
              `}
            >
              <item.icon
                size={20}
                strokeWidth={1.5} // Thin icons
                className={`transition-colors duration-300 ${
                  isActive ? "text-[#D4AF37]" : "group-hover:text-[#D4AF37]"
                }`}
              />
              <span className="font-medium tracking-wide text-sm z-10">
                {item.name}
              </span>

              {item.name === "Estoque" && alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 animate-pulse">
                  {alertCount}
                </span>
              )}

              {/* Glass shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-[#1E293B]/50 bg-[#0F172A]/30">
        <div className="bg-[#0F172A]/50 rounded-xl p-3 flex items-center gap-3 border border-[#1E293B] hover:border-[#D4AF37]/30 transition-colors group cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
            <Smartphone size={18} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">
              Admin
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Multicell System
            </p>
          </div>
          <Link
            href="/login"
            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
