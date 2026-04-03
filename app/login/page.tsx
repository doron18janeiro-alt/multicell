"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CircleDollarSign,
  Loader2,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { resetSegmentSessionCache } from "@/hooks/useSegment";

const commercialHighlights = [
  {
    title: "Plano Mensal",
    price: "R$ 119,90",
    description: "Flexibilidade total para sua gestão.",
    icon: CircleDollarSign,
    accent: "from-cyan-500/18 to-transparent",
    border: "border-cyan-400/22",
  },
  {
    title: "Plano Anual",
    price: "R$ 1.199,00",
    description: "Economize R$ 240,00 por ano (2 meses grátis!).",
    badge: "RECOMENDADO",
    icon: BadgeCheck,
    accent: "from-[#FACC15]/18 to-transparent",
    border: "border-[#FACC15]/38",
  },
  {
    title: "Módulo Fiscal",
    price: "R$ 0,50/nota",
    description: "Emissão de Notas (NFC-e) em 3s. Sem taxas extras.",
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
    <div className="relative min-h-screen overflow-hidden bg-[#020617] font-sans">
      {/* Background Gradient & Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] z-0"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <FloatingLogoBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.section
            initial={{ opacity: 0, x: -36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#081120]/76 p-7 shadow-[0_0_70px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8 lg:p-10"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/60 to-transparent" />
            <div className="absolute -left-12 top-12 h-48 w-48 rounded-full bg-[#FACC15]/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FACC15]">
                <Sparkles className="h-3.5 w-3.5" />
                Lançamento Oficial WTM
              </div>

              <motion.div
                className="mt-8 flex justify-center lg:justify-start"
                animate={{ y: [0, -10, 0], scale: [1, 1.015, 1] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/logo-wtm.png"
                  alt="World Tech Manager"
                  width={420}
                  height={290}
                  priority
                  className="h-auto w-full max-w-[320px] object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.2)]"
                />
              </motion.div>

              <div className="mt-8 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300/86">
                  Gestão Global de Tecnologia e Negócios
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Assinatura recorrente com fiscal sob demanda.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                  O World Tech Manager combina PDV, atendimento, documentos e emissão fiscal em uma operação única, pronta para mensalidade, anual e lucro por nota.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {commercialHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className={`relative overflow-hidden rounded-[26px] border ${item.border} bg-white/5 p-5`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-3">
                          <div className="rounded-2xl bg-[#0B1120]/75 p-3 text-[#FACC15]">
                            <Icon className="h-5 w-5" />
                          </div>
                          {item.badge ? (
                            <span className="rounded-full border border-[#FACC15]/30 bg-[#FACC15]/12 px-2.5 py-1 text-[10px] font-bold tracking-[0.24em] text-[#FACC15]">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                          {item.title}
                        </p>
                        <p className="mt-3 text-3xl font-black text-white">
                          {item.price}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[24px] border border-cyan-400/18 bg-cyan-400/5 p-5">
                <p className="text-sm font-semibold text-cyan-200">
                  Pagamentos via Mercado Pago e operação fiscal acoplada
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Plano anual com entrada forte de caixa, plano mensal para baixa fricção comercial e NFC-e cobrada apenas quando o lojista realmente usa.
                </p>
              </div>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full p-1"
          >
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_0_50px_rgba(8,145,178,0.1)]">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#06b6d4]" />

              <div className="p-8 md:p-10">
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="inline-flex items-center text-sm font-medium text-slate-400 transition-colors hover:text-amber-300"
                  >
                    {"<- Voltar para Escolha de Segmento"}
                  </button>
                </div>

                <div className="mb-8 flex flex-col items-center">
                  <motion.div
                    className="relative mb-4 group"
                    animate={{ y: [0, -7, 0], scale: [1, 1.01, 1] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Image
                      src="/logo-wtm.png"
                      alt="World Tech Manager"
                      width={280}
                      height={190}
                      priority
                      className="relative z-10 h-auto w-full max-w-[230px] drop-shadow-[0_0_16px_rgba(250,204,21,0.2)]"
                    />
                  </motion.div>
                  <h2 className="text-2xl font-bold tracking-wide text-white">
                    WORLD TECH <span className="text-cyan-400">MANAGER</span>
                  </h2>
                  <p className="mt-1 text-sm uppercase tracking-wider text-slate-400">
                    Acesso ao Ecossistema
                  </p>
                  <p className="mt-2 text-center text-sm text-slate-500">
                    World Tech Manager - Gestão Inteligente
                  </p>
                </div>

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

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Link
                      href="/"
                      className="mt-3 block w-full rounded-xl border border-amber-400/40 py-3 text-center font-bold text-amber-300 transition-all hover:bg-amber-400/10"
                    >
                      VOLTAR PARA ESCOLHA DE SEGMENTO
                    </Link>
                  </motion.div>
                </form>
              </div>

              <div className="border-t border-slate-800 bg-[#020617]/50 p-4 text-center">
                <p className="text-xs text-slate-500">
                  © {new Date().getFullYear()} World Tech Manager. Todos os direitos
                  reservados.
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  World Tech Manager - Gestão Inteligente
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
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
