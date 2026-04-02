"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Smartphone,
  Headphones,
  Speaker,
  Watch,
  Tablet,
  Gamepad,
  Cable,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Cpu,
} from "lucide-react";
import { resetSegmentSessionCache } from "@/hooks/useSegment";

const FloatingIcons = () => {
  const [mounted, setMounted] = useState(false);
  const icons = [
    Smartphone,
    Headphones,
    Speaker,
    Watch,
    Tablet,
    Gamepad,
    Cable,
    Cpu,
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => {
        const Icon = icons[i % icons.length];
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;

        return (
          <motion.div
            key={i}
            className="absolute text-cyan-500/10"
            style={{
              left: `${randomX}%`,
              top: `${randomY}%`,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              y: [0, -50, 0],
              x: [0, 30, 0],
              rotate: [0, 180, 360],
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Icon size={24 + Math.random() * 24} strokeWidth={1.5} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const payload = await res.json();
        resetSegmentSessionCache();
        router.push(payload?.nextPath || "/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Credenciais inválidas");
        setLoading(false);
      }
    } catch (err) {
      setError("Erro ao conectar com o sistema.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#020617] overflow-hidden font-sans">
      {/* Background Gradient & Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] z-0"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      {/* Floating Product Icons */}
      <FloatingIcons />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md p-1 z-10 mx-4"
      >
        <div className="relative bg-[#0f172a]/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(8,145,178,0.1)] overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#06b6d4]"></div>

          <div className="p-8 md:p-10">
            {/* Header / Logo */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                className="relative mb-4 group"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/40 transition-all"></div>
                <Image
                  src="/logo.png"
                  alt="World Tech Manager"
                  width={80}
                  height={80}
                  priority
                  className="w-20 h-auto relative z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                />
              </motion.div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                WORLD TECH <span className="text-cyan-400">MANAGER</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1 tracking-wider uppercase">
                Acesso ao Ecossistema
              </p>
              <p className="mt-2 text-center text-sm text-slate-500">
                World Tech Manager - Gestão Inteligente
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-xs font-medium text-cyan-500/80 mb-1.5 ml-1 uppercase tracking-wider">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5 transition-colors group-focus-within:text-cyan-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#020617]/50 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-cyan-500/80 mb-1.5 ml-1 uppercase tracking-wider">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5 transition-colors group-focus-within:text-cyan-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#020617]/50 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 transition-colors"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <Link
                      href="/recuperar"
                      className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center font-medium"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FACC15] hover:bg-yellow-500 text-[#0B1120] font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    ACESSAR
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <Link href="/cadastro">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full mt-3 border border-amber-400/40 text-amber-300 font-bold py-3 rounded-xl text-center hover:bg-amber-400/10 transition-all"
                >
                  CRIAR CONTA
                </motion.div>
              </Link>
            </form>
          </div>

          {/* Footer of Card */}
          <div className="bg-[#020617]/50 p-4 text-center border-t border-slate-800">
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} World Tech Manager. Todos os direitos
              reservados.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              World Tech Manager - Gestão Inteligente
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <Link
                href="/privacidade"
                className="hover:text-slate-300 transition-colors"
              >
                Privacidade
              </Link>
              <span>|</span>
              <Link
                href="/termos"
                className="hover:text-slate-300 transition-colors"
              >
                Termos
              </Link>
              <span>|</span>
              <Link
                href="/suporte"
                className="hover:text-slate-300 transition-colors"
              >
                Suporte
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
