"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = String(params?.token || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    const validateToken = async () => {
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
          {
            cache: "no-store",
          },
        );

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!cancelled) {
            setError(payload.error || "Link inválido ou expirado.");
            setTimeout(() => router.replace("/login"), 1500);
          }
          return;
        }

        if (!cancelled) {
          setTokenValidated(true);
        }
      } catch (requestError) {
        console.error(requestError);
        if (!cancelled) {
          setError("Não foi possível validar o link de redefinição.");
          setTimeout(() => router.replace("/login"), 1500);
        }
      } finally {
        if (!cancelled) {
          setValidatingToken(false);
        }
      }
    };

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [router, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!tokenValidated) {
      setError("Token inválido ou expirado.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Erro ao redefinir senha.");
        return;
      }

      setSuccess("Senha redefinida com sucesso. Redirecionando para o login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (requestError) {
      console.error(requestError);
      setError("Falha de conexão ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#020617] overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-1 z-10 mx-4"
      >
        <div className="bg-[#0f172a]/65 backdrop-blur-xl border border-amber-400/30 rounded-2xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-2xl font-black text-white mb-2">
              Definir Nova Senha
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              Digite sua nova senha para concluir a recuperação.
            </p>

            {validatingToken ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Loader2 className="animate-spin h-6 w-6 text-amber-300" />
                <p className="text-sm">Validando link de redefinição...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                <input
                  type="password"
                  placeholder="Nova senha"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  className="w-full bg-[#020617]/55 border border-slate-700 text-slate-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
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
                disabled={loading || !tokenValidated}
                className="w-full bg-[#FACC15] hover:bg-yellow-400 text-[#0B1120] font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    REDEFINIR SENHA
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-slate-400 hover:text-amber-300 transition-colors"
              >
                Voltar para login
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
