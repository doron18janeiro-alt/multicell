"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Settings,
  Save,
  Lock,
  Building2,
  Store,
  CreditCard,
} from "lucide-react";

interface CompanyConfig {
  name: string;
  document: string;
  phone: string;
  address: string;
  logoUrl: string;
  debitRate: number;
  creditRate: number;
}

export default function Configuracoes() {
  const [config, setConfig] = useState<CompanyConfig>({
    name: "",
    document: "",
    phone: "",
    address: "",
    logoUrl: "",
    debitRate: 1.99,
    creditRate: 3.99,
  });
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data && !data.error) {
        setConfig({
          name: data.name || "",
          document: data.document || "",
          phone: data.phone || "",
          address: data.address || "",
          logoUrl: data.logoUrl || "",
          debitRate: data.debitRate ?? 1.99,
          creditRate: data.creditRate ?? 3.99,
        });
      }
    } catch (error) {
      console.error("Failed to load config", error);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMsg("✅ Configurações salvas com sucesso!");
      } else {
        setMsg("❌ Erro ao salvar configurações.");
      }
    } catch (error) {
      setMsg("❌ Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        setMsg("✅ Senha alterada com sucesso!");
        setNewPassword("");
      } else {
        setMsg("❌ Erro ao alterar senha.");
      }
    } catch (error) {
      setMsg("❌ Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 ml-64">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Settings className="text-[#D4AF37]" size={32} strokeWidth={1.5} />
            Configurações do Sistema
          </h1>
          <p className="text-slate-400 mt-2 ml-11">
            Gerencie dados, taxas financeiras e segurança
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
          {/* Company Settings */}
          <section className="bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Store size={120} />
            </div>

            <h2 className="text-xl font-semibold text-[#D4AF37] mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
              <Building2 size={20} />
              Dados da Loja
            </h2>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) =>
                    setConfig({ ...config, name: e.target.value })
                  }
                  className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  CNPJ / Documento
                </label>
                <input
                  type="text"
                  value={config.document}
                  onChange={(e) =>
                    setConfig({ ...config, document: e.target.value })
                  }
                  className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={config.address}
                  onChange={(e) =>
                    setConfig({ ...config, address: e.target.value })
                  }
                  className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={config.phone}
                  onChange={(e) =>
                    setConfig({ ...config, phone: e.target.value })
                  }
                  className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>
          </section>

          {/* Taxas e Segurança */}
          <div className="space-y-8">
            {/* Taxas do Cartão */}
            <section className="bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <CreditCard size={100} />
              </div>
              <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                <CreditCard size={20} />
                Taxas da Maquininha (%)
              </h2>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Taxa Débito (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.debitRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        debitRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Taxa Crédito (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.creditRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        creditRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Security */}
            <section className="bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-red-400 mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                <Lock size={20} />
                Segurança
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Nova Senha de Acesso
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                    placeholder="Alterar senha..."
                  />
                </div>
              </div>
            </section>

            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black font-semibold py-4 rounded-xl hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2 text-lg"
            >
              <Save size={20} />
              SALVAR TODAS AS ALTERAÇÕES
            </button>

            {msg && (
              <div
                className={`p-4 rounded-xl border ${
                  msg.includes("✅")
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                } flex items-center justify-center font-medium animate-pulse`}
              >
                {msg}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
