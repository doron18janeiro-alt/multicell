"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  Users,
  Package,
  Settings,
  LogOut,
  Smartphone,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Vendas / PDV", icon: ShoppingCart, path: "/vendas" },
    { name: "Ordens de Serviço", icon: Wrench, path: "/os/novo" }, // Apontando para novo para facilitar o fluxo
    { name: "Clientes", icon: Users, path: "/clientes" },
    { name: "Estoque", icon: Package, path: "/estoque" },
    { name: "Configurações", icon: Settings, path: "/configuracoes" },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0A192F] border-r border-[#233554] flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Area */}
      <div className="p-4 mb-6 flex justify-center border-b border-gray-800">
        <img src="/logo.jpg" alt="Multicell" className="h-14 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-[#233554]">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-[#233554] flex items-center justify-center text-[#D4AF37]">
            <Users size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-xs text-slate-500">Gerente</p>
          </div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 text-sm py-2 transition-colors">
          <LogOut size={16} /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
