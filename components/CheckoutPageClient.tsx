"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Crown } from "lucide-react";

type PlanType = "monthly" | "annual";

interface SubscriptionPayload {
  companyId: string;
  subscriptionStatus:
    | "trialing"
    | "active"
    | "expired"
    | "unpaid"
    | "canceled";
}

const PLAN_LABEL: Record<PlanType, string> = {
  monthly: "COMEÇAR 7 DIAS GRÁTIS",
  annual: "PAGAR PLANO ANUAL",
};

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionPayload | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "approved") {
      setStatusMessage("Pagamento aprovado! Estamos liberando seu acesso automaticamente.");
    } else if (status === "pending") {
      setStatusMessage("Pagamento em análise. Assim que confirmar, o Dashboard será liberado automaticamente.");
    } else if (status === "failed") {
      setStatusMessage("Falha no pagamento. Tente novamente.");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscription/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401) {
            setSubscription(null);
            return;
          }
          throw new Error("Erro ao carregar assinatura.");
        }

        const data = (await response.json()) as SubscriptionPayload;
        setSubscription(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Não foi possível carregar o status da assinatura.");
      }
    };

    fetchSubscription();
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");

    if (status !== "approved" && status !== "pending") {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/subscription/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SubscriptionPayload;
        setSubscription(data);
      } catch (pollError) {
        console.error(pollError);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [searchParams]);

  useEffect(() => {
    const status = searchParams.get("status");

    if (
      subscription?.subscriptionStatus === "active" &&
      (status === "approved" || status === "pending")
    ) {
      const redirectTimer = window.setTimeout(() => {
        router.push("/dashboard");
      }, 1200);

      return () => window.clearTimeout(redirectTimer);
    }
  }, [router, searchParams, subscription?.subscriptionStatus]);

  const handleCheckout = async (plan: PlanType) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const response = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao iniciar checkout.");
      }

      if (!payload.checkoutUrl) {
        throw new Error("URL de checkout inválida.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (checkoutError: any) {
      console.error(checkoutError);
      setError(checkoutError.message || "Erro ao iniciar checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-white relative overflow-hidden">
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-amber-400/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 -right-16 w-96 h-96 bg-cyan-500/20 blur-3xl rounded-full" />

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <Crown className="w-9 h-9 text-amber-300" />
            Checkout Multicell SaaS
          </h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-zinc-600/80 bg-zinc-900/60 hover:bg-zinc-800/70 transition-colors text-sm"
          >
            Voltar ao Sistema
          </Link>
        </div>

        <div className="rounded-3xl border border-amber-300/35 bg-white/5 backdrop-blur-xl p-8 shadow-[0_20px_80px_rgba(250,204,21,0.15)] mb-8">
          <h2 className="text-2xl md:text-3xl font-black">
            Escolha seu plano para liberar o Dashboard
          </h2>
          <p className="text-slate-300 mt-2">
            Experimente grátis por 7 dias. A cobrança de R$ 99,90 só será
            realizada após o período de teste. Cancele quando quiser
            diretamente no seu painel.
          </p>
        </div>

        {statusMessage && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-amber-400/40 bg-zinc-900/55 backdrop-blur-xl p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300 mb-2">
              Assinatura Recorrente
            </p>
            <h3 className="text-4xl font-black mb-3">R$ 99,90/mês</h3>
            <p className="text-slate-300 text-sm mb-6">
              Experimente grátis por 7 dias. A cobrança de R$ 99,90 só será
              realizada após o período de teste. Cancele quando quiser
              diretamente no seu painel.
            </p>
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan !== null || !subscription}
              className="w-full py-5 text-lg rounded-2xl bg-amber-400 text-black font-extrabold hover:bg-amber-300 transition-colors disabled:opacity-60"
            >
              {loadingPlan === "monthly"
                ? "Carregando Checkout..."
                : PLAN_LABEL.monthly}
            </button>
          </section>

          <section className="rounded-2xl border border-cyan-400/35 bg-zinc-900/55 backdrop-blur-xl p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-2">
              Pagamento Único
            </p>
            <h3 className="text-4xl font-black mb-3">R$ 899,00/ano</h3>
            <p className="text-slate-300 text-sm mb-6">
              Pague com cartao de credito em ate 12x, debito ou PIX.
            </p>
            <button
              onClick={() => handleCheckout("annual")}
              disabled={loadingPlan !== null || !subscription}
              className="w-full py-5 text-lg rounded-2xl bg-cyan-500 text-white font-extrabold hover:bg-cyan-400 transition-colors disabled:opacity-60"
            >
              {loadingPlan === "annual"
                ? "Carregando Checkout..."
                : PLAN_LABEL.annual}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
