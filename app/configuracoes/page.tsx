"use client";
import React, { useState } from "react";

export default function ConfiguracoesPage() {
  const [laborPrice, setLaborPrice] = useState("80.00");

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-500 mb-8 uppercase tracking-wider">
          Configurações do Sistema
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card Financeiro */}
          <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              💰 Valores de Serviço
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Mão de Obra Padrão (R$)
                </label>
                <input
                  type="number"
                  value={laborPrice}
                  onChange={(e) => setLaborPrice(e.target.value)}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-all"
                />
              </div>
              <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all active:scale-95">
                Salvar Preferências
              </button>
            </div>
          </div>

          {/* Card Personalização */}
          <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-300">
              🏬 Dados da Loja
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Estes dados serão utilizados no cabeçalho das Ordens de Serviço
              impressas para seus clientes.
            </p>
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <span className="text-yellow-500 text-xs font-bold uppercase">
                Em Breve:
              </span>
              <p className="text-gray-300 text-xs mt-1">
                Impressão térmica de recibos via Bluetooth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
