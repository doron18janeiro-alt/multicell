"use client";
import React, { useState } from "react";

export default function Configuracoes() {
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleChangePassword = async () => {
    setStatus("Salvando...");
    const response = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (response.ok) {
      setStatus("✅ Senha alterada com sucesso!");
      setNewPassword("");
    } else {
      setStatus("❌ Erro ao alterar senha.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      <div className="flex items-center gap-4 mb-8">
        <img src="/logo (2).jpg" alt="Multicell" className="h-12 w-auto" />
        <h1 className="text-2xl font-bold text-yellow-500 uppercase">
          Configurações da Loja
        </h1>
      </div>

      <div className="max-w-md bg-[#1e293b] p-6 rounded-lg border border-gray-700 shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">
          Segurança
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Nova Senha de Acesso
            </label>
            <input
              type="password"
              placeholder="Digite a nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#0f172a] border border-gray-700 rounded p-3 text-white focus:border-yellow-500 outline-none"
            />
          </div>

          <button
            onClick={handleChangePassword}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-all transform active:scale-95"
          >
            ATUALIZAR SENHA
          </button>

          {status && (
            <p
              className={`text-center text-sm font-bold ${
                status.includes("✅") ? "text-green-400" : "text-yellow-500"
              }`}
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
