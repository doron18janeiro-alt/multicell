"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Fingerprint,
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { formatCpf, isValidCpf, sanitizeCpf } from "@/lib/cpf";
import { resetSegmentSessionCache } from "@/hooks/useSegment";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (field: string, value: string) => {
    if (field === "cpf") {
      setForm((prev) => ({ ...prev, cpf: formatCpf(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cpfDigits = sanitizeCpf(form.cpf);

    if (!isValidCpf(cpfDigits)) {
      setError("CPF inválido. Verifique e tente novamente.");
      return;
    }

    if (!form.birthDate) {
      setError("Data de nascimento obrigatória.");
      return;
    }

    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cpf: cpfDigits,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Erro ao criar conta.");
        return;
      }

      resetSegmentSessionCache();
      setSuccess("Conta criada com sucesso! Redirecionando para a configuracao inicial...");
      setTimeout(() => router.push(payload?.nextPath || "/setup"), 1200);
    } catch (requestError) {
      console.error(requestError);
      setError("Falha de conexão ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#020617] overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md p-1 z-10 mx-4"
      >
        <div className="relative bg-[#0f172a]/65 backdrop-blur-xl border border-amber-400/35 rounded-2xl overflow-hidden shadow-[0_0_45px_rgba(250,204,21,0.14)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          <div className="p-8 md:p-9">
            <div className="text-center mb-7">
              <div className="mb-4 flex justify-center">
                <Image
                  src="/logo.png"
                  alt="World Tech Manager"
                  width={72}
                  height={72}
                  priority
                  className="h-[72px] w-auto drop-shadow-[0_0_14px_rgba(250,204,21,0.35)]"
                />
              </div>
              <h1 className="text-2xl font-black text-white tracking-wide">
                CRIAR CONTA <span className="text-amber-300">WTM</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Comece com 7 dias de teste gratuito e explore o Dashboard sem
                informar cartao agora.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Gestão Global de Tecnologia e Negócios
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Nome Completo"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="CPF"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={form.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  maxLength={14}
                  required
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5 pointer-events-none" />
                <input
                  type="date"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={form.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                <input
                  type="email"
                  placeholder="E-mail"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-300 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm text-center"
                >
                  {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FACC15] hover:bg-yellow-400 text-[#0B1120] font-black py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.45)] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    CRIAR MINHA CONTA
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-slate-400 hover:text-amber-300 transition-colors"
              >
                Já tenho conta. Voltar para login
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
