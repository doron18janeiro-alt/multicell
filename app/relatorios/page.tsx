"use client";

import { AlertTriangle } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
      <div className="bg-yellow-100 p-4 rounded-full">
        <AlertTriangle className="w-12 h-12 text-yellow-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800">Página em Manutenção</h1>
      <p className="text-gray-600 max-w-md">
        Função em manutenção. Utilize o Dashboard para métricas em tempo real.
        Estamos aprimorando os relatórios detalhados para garantir 100% de precisão.
      </p>
    </div>
  );
}
