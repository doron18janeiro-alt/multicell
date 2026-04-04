"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CircleDollarSign,
  Loader2,
  ReceiptText,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { resetSegmentSessionCache } from "@/hooks/useSegment";

const premiumPlans = [
  {
    title: "Plano Profissional",
    price: "R$ 119,90/mês",
    description: "Flexibilidade total para sua gestão comercial.",
    icon: TrendingUp,
    accent: "from-cyan-500/18 to-transparent",
    border: "border-cyan-400/22",
  },
  {
    title: "Economia Inteligente",
    price: "R$ 1.199,00/ano",
    description: "2 Meses Grátis! Economize R$ 240,00 por ano.",
    badge: "RECOMENDADO",
    icon: CircleDollarSign,
    accent: "from-[#FACC15]/18 to-transparent",
    border: "border-[#FACC15]/38",
  },
  {
    title: "Módulo Fiscal NFC-e",
    price: "R$ 0,50/nota",
    description: "Emissão de Notas Fiscais em 3s. Pague pelo uso.",
    icon: ReceiptText,
    accent: "from-emerald-500/18 to-transparent",
    border: "border-emerald-400/22",
  },
];

const FloatingLogoBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-[15%] w-[600px] max-w-[70vw] -translate-x-1/2 opacity-[0.08] blur-[0.5px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 0.08, y: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/wtm-badge.png"
          alt=""
          width={800}
          height={800}
          priority
          className="h-auto w-full object-contain"
        />
      </motion.div>
      <motion.div
        className="absolute bottom-[-8%] right-[-4%] w-[400px] max-w-[50vw] opacity-[0.05] blur-sm"
        animate={{ x: [0, -12, 0], y: [0, 8, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/wtm-badge.png"
          alt=""
          width={600}
          height={600}
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
    <div className="relative min-h-screen overflow-hidden bg-[#020617] font-sans">
      {/* Background Gradient & Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] z-0"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <FloatingLogoBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Back Button */}
        <div className="absolute top-8 left-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Escolha de Segmento
          </button>
        </div>

        {/* Floating Logo */}
        <motion.div
          className="mb-8 flex flex-col items-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="relative mb-6"
            animate={{ y: [0, -8, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/wtm-badge.png"
              alt="World Tech Manager"
              width={200}
              height={200}
              priority
              className="h-auto w-full max-w-[200px] object-contain drop-shadow-[0_0_25px_rgba(250,204,21,0.4)]"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(250, 204, 21, 0.6))',
              }}
            />
          </motion.div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wide text-[#FACC15] drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]">
              WORLD TECH MANAGER
            </h1>
            <div className="mt-2 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#FACC15]/70 to-transparent"></div>
            <p className="mt-3 text-sm uppercase tracking-wider text-slate-400">
              Acesso ao Ecossistema
            </p>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_0_50px_rgba(8,145,178,0.1)]">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#06b6d4]" />

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="group">
                    <label className="mb-1.5 ml-1 block text-xs font-medium uppercase tracking-wider text-cyan-500/80">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-[#020617]/50 py-3 pl-10 pr-4 text-slate-100 transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        placeholder="seu-email@wtm.com.br"
                        required
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="mb-1.5 ml-1 block text-xs font-medium uppercase tracking-wider text-cyan-500/80">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-[#020617]/50 py-3 pl-10 pr-12 text-slate-100 transition-all placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-cyan-300"
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
                        className="text-xs text-slate-400 transition-colors hover:text-cyan-300"
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
                    className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] py-3.5 font-bold text-[#0B1120] transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:bg-yellow-500 hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      ACESSAR
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Premium Flashcards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="mt-12 w-full max-w-5xl"
        >
          <div className="grid gap-6 md:grid-cols-3">
            {premiumPlans.map((plan, index) => {
              const Icon = plan.icon;

              return (
                <motion.div
                  key={plan.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  className={`group relative overflow-hidden rounded-[24px] border ${plan.border} bg-gradient-to-br from-white/8 to-white/2 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(250,204,21,0.15)]`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.accent} opacity-60`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  
                  {/* Efeito de brilho no hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="rounded-2xl bg-[#0B1121]/80 p-3 text-[#FACC15] shadow-lg backdrop-blur-sm border border-[#FACC15]/20">
                        <Icon className="h-6 w-6" />
                      </div>
                      {plan.badge ? (
                        <motion.span 
                          className="rounded-full border border-[#FACC15]/40 bg-[#FACC15]/15 px-3 py-1.5 text-[10px] font-bold tracking-[0.24em] text-[#FACC15] shadow-lg backdrop-blur-sm"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {plan.badge}
                        </motion.span>
                      ) : null}
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/80">
                        {plan.title}
                      </p>
                      <p className="text-3xl font-black text-white drop-shadow-lg">
                        {plan.price}
                      </p>
                      <p className="text-sm leading-6 text-slate-200/90 font-medium">
                        {plan.description}
                      </p>
                    </div>
                    
                    {/* Indicador visual de destaque */}
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[#FACC15]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} World Tech Manager. Todos os direitos reservados.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Link
              href="/privacidade"
              className="transition-colors hover:text-slate-300"
            >
              Privacidade
            </Link>
            <span>|</span>
            <Link
              href="/termos"
              className="transition-colors hover:text-slate-300"
            >
              Termos
            </Link>
            <span>|</span>
            <Link
              href="/suporte"
              className="transition-colors hover:text-slate-300"
            >
              Suporte
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}