"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Credenciais inválidas");
      }
    } catch (err) {
      setError("Erro ao conectar com o sistema.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617]">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-[#0f172a] rounded-xl shadow-2xl w-full max-w-md border border-slate-800"
      >
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Bem-vindo
        </h1>
        <p className="text-slate-400 mb-6 text-center">
          Acesse o Multicell System
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-[#1e293b] text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-[#1e293b] text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Digite sua senha"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded transition-colors"
          >
            Acessar Sistema
          </button>
        </div>
      </form>
    </div>
  );
}
