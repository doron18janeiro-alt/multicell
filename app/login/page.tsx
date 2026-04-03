"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { resetSegmentSessionCache } from "@/hooks/useSegment";

const FloatingLogoBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-[10%] w-[900px] max-w-[88vw] -translate-x-1/2 opacity-[0.16] blur-[0.3px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 0.16, y: [0, -18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/logo-wtm.png"
          alt=""
          width={1200}
          height={820}
          priority
          className="h-auto w-full object-contain"
        />
      </motion.div>
      <motion.div
        className="absolute bottom-[-10%] right-[-6%] w-[520px] max-w-[58vw] opacity-[0.08] blur-sm"
        animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/logo-wtm.png"
          alt=""
          width={900}
          height={615}
          className="h-auto w-full object-contain"
        />
      </motion.div>
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

      <FloatingLogoBackground />

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
            <div className="mb-6">
              <Link
                href="/"
                className="inline-flex items-center text-sm font-medium text-slate-400 transition-colors hover:text-amber-300"
              >
                {"<- Voltar para Escolha de Segmento"}
              </Link>
            </div>
            {/* Header / Logo */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                className="relative mb-4 group"
                whileHover={{ scale: 1.05 }}
              >
                <Image
                  src="/logo-wtm.png"
                  alt="World Tech Manager"
                  width={280}
                  height={190}
                  priority
                  className="h-auto w-full max-w-[230px] relative z-10 drop-shadow-[0_0_16px_rgba(250,204,21,0.2)]"
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
                      placeholder="seu-email@wtm.com.br"
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

              <Link href="/">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full mt-3 border border-amber-400/40 text-amber-300 font-bold py-3 rounded-xl text-center hover:bg-amber-400/10 transition-all"
                >
                  VOLTAR PARA ESCOLHA DE SEGMENTO
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
