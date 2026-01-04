"use client";

import { useState } from "react";
import {
  Search,
  Smartphone,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default function Consulta() {
  const [searchData, setSearchData] = useState({ id: "", document: "" });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/os/status?id=${searchData.id}&document=${searchData.document}`
      );
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Erro ao buscar.");
      }
    } catch (err) {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#112240] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-[#0A192F] p-6 text-center border-b border-[#233554]">
          <div className="w-16 h-16 mx-auto bg-[#D4AF37] rounded-full flex items-center justify-center text-[#0A192F] mb-4">
            <Smartphone size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">
            MULTICELL
          </h1>
          <p className="text-sm text-[#D4AF37] uppercase tracking-widest">
            Consulta de Status
          </p>
        </div>

        <div className="p-8">
          {!result ? (
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Número da O.S.
                </label>
                <input
                  required
                  type="number"
                  className="w-full bg-[#0B1120] border border-slate-700 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="Ex: 1050"
                  value={searchData.id}
                  onChange={(e) =>
                    setSearchData({ ...searchData, id: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  CPF do Cliente
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-[#0B1120] border border-slate-700 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="Apenas números"
                  value={searchData.document}
                  onChange={(e) =>
                    setSearchData({ ...searchData, document: e.target.value })
                  }
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A192F] font-bold py-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Consultando..." : "CONSULTAR STATUS"}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex p-4 rounded-full bg-[#112240] border-2 border-[#D4AF37]">
                {result.status === "PRONTO" ? (
                  <CheckCircle size={48} className="text-green-500" />
                ) : result.status === "ENTREGUE" ? (
                  <CheckCircle size={48} className="text-blue-500" />
                ) : (
                  <Clock size={48} className="text-[#D4AF37]" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {result.brand} {result.model}
                </h2>
                <p className="text-slate-400 text-sm">
                  Última atualização:{" "}
                  {new Date(result.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="p-4 bg-[#0B1120] rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase mb-1">
                  Status Atual
                </p>
                <p
                  className={`text-2xl font-bold ${
                    result.status === "PRONTO"
                      ? "text-green-500"
                      : result.status === "ENTREGUE"
                      ? "text-blue-500"
                      : "text-[#D4AF37]"
                  }`}
                >
                  {result.status}
                </p>
              </div>

              <button
                onClick={() => setResult(null)}
                className="text-slate-400 hover:text-white text-sm underline"
              >
                Nova Consulta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
