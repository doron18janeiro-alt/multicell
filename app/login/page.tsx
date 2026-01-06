"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Cookie is set by the server
        localStorage.setItem("multicell_auth", "true"); // Keep for client-side checks if any
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Credenciais inválidas");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#112240] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-[#0A192F] p-8 text-center border-b border-[#233554]">
          <div className="flex justify-center mb-6">
            <img
              src="/logo (2).jpg"
              alt="Multicell Logo"
              className="w-40 h-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wider">
            MULTICELL
          </h1>
          <p className="text-sm text-[#D4AF37] uppercase tracking-widest mt-2">
            Acesso Restrito
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="email"
                required
                className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                placeholder="admin@multicell.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
              <input
                type="password"
                required
                className="w-full bg-[#0B1120] border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A192F] font-bold py-4 rounded-lg transition-colors shadow-lg hover:shadow-[#D4AF37]/20"
          >
            ENTRAR NO SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
}
