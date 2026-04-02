"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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

const PLAN_COPY = {
  monthly: {
    eyebrow: "Plano Profissional",
    title: "Mensal",
    price: "R$ 119,90",
    period: "/mês",
    description:
      "Experimente grátis por 7 dias. A cobrança de R$ 119,90 só acontece após o período de teste.",
    button: "Assinar Mensal",
    accent: "amber",
  },
  annual: {
    eyebrow: "Plano Profissional",
    title: "Anual",
    price: "R$ 1.199,00",
    period: "/ano",
    description:
      "Pague 10 meses e leve 12. Ideal para reduzir custo e travar o melhor valor do ano.",
    button: "Assinar Anual",
    accent: "gold",
  },
} as const;

const SUPPORT_NOTE =
  "Processado via Mercado Pago. Parcelamento em até 12x no cartão disponível para o plano anual.";

const ANNUAL_SAVINGS = "ECONOMIZE R$ 239,80";

const cardClasses: Record<
  PlanType,
  { base: string; badge: string; button: string; selected: string; ring: string }
> = {
  monthly: {
    base: "border-amber-400/20 bg-zinc-900/60",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    button:
      "bg-amber-400 text-black hover:bg-amber-300 disabled:bg-amber-400/60",
    selected: "border-amber-300/60 shadow-[0_20px_80px_rgba(250,204,21,0.16)]",
    ring: "bg-amber-300",
  },
  annual: {
    base: "border-yellow-300/25 bg-zinc-900/70",
    badge: "border-yellow-300/35 bg-yellow-300/12 text-yellow-100",
    button:
      "bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 text-black hover:brightness-105 disabled:brightness-90",
    selected:
      "border-yellow-300/70 shadow-[0_24px_90px_rgba(250,204,21,0.22)]",
    ring: "bg-yellow-200",
  },
};

export default function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [subscription, setSubscription] = useState<SubscriptionPayload | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const status = searchParams.get("status");
    const plan = searchParams.get("plan");

    if (plan === "monthly" || plan === "annual") {
      setSelectedPlan(plan);
    }

    if (status === "approved") {
      setStatusMessage(
        "Pagamento aprovado. Estamos liberando seu acesso automaticamente.",
      );
    } else if (status === "pending") {
      setStatusMessage(
        "Pagamento em análise. Assim que confirmar, o Dashboard será liberado automaticamente.",
      );
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

    void fetchSubscription();
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

  const selectedPlanCopy = useMemo(
    () => PLAN_COPY[selectedPlan],
    [selectedPlan],
  );

  const handleCheckout = async (plan: PlanType) => {
    try {
      setError("");
      setLoadingPlan(plan);
      setSelectedPlan(plan);

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

  const renderPlanCard = (plan: PlanType) => {
    const planData = PLAN_COPY[plan];
    const isSelected = selectedPlan === plan;
    const styles = cardClasses[plan];
    const isAnnual = plan === "annual";

    return (
      <section
        key={plan}
        className={`relative rounded-[28px] border p-8 transition-all ${styles.base} ${isSelected ? styles.selected : "hover:border-slate-600/70"}`}
      >
        {isAnnual && (
          <div className="absolute -top-4 left-6 inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-100 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[0_14px_40px_rgba(250,204,21,0.18)]">
            <Sparkles className="h-3.5 w-3.5" />
            2 MESES GRÁTIS
          </div>
        )}

        <button
          type="button"
          onClick={() => setSelectedPlan(plan)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                {planData.eyebrow}
              </p>
              <h3 className="mt-3 text-3xl font-black text-white">
                {planData.title}
              </h3>
            </div>

            <span
              className={`mt-1 h-4 w-4 rounded-full ring-4 ring-white/5 ${isSelected ? styles.ring : "bg-slate-700"}`}
            />
          </div>

          <div className="mt-5 flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight text-white">
              {planData.price}
            </span>
            <span className="pb-1 text-sm font-semibold text-slate-400">
              {planData.period}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            {planData.description}
          </p>

          {isAnnual && (
            <div className="mt-5 inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-100">
              {ANNUAL_SAVINGS}
            </div>
          )}
        </button>

        <button
          onClick={() => handleCheckout(plan)}
          disabled={loadingPlan !== null || !subscription}
          className={`mt-8 min-h-14 w-full rounded-2xl px-6 text-base font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${styles.button}`}
        >
          {loadingPlan === plan ? "Carregando Checkout..." : planData.button}
        </button>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          <span>
            {plan === "monthly"
              ? "Teste grátis de 7 dias antes da primeira cobrança."
              : "Plano recomendado para reduzir custo anual."}
          </span>
        </div>
      </section>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060b18] text-white">
      <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight">
              <Crown className="h-9 w-9 text-amber-300" />
              Assinatura Multicell System
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Escolha o ciclo ideal para liberar o Dashboard. O anual recebe o
              maior destaque porque reduz custo e mantém o acesso previsível.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-600/80 bg-zinc-900/60 px-4 text-sm transition-colors hover:bg-zinc-800/70"
          >
            Voltar ao Sistema
          </Link>
        </div>

        <div className="mb-8 rounded-[32px] border border-slate-700/70 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
                Tabela de Planos
              </p>
              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
                Plano Profissional com oferta anual
              </h2>
            </div>

            <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-[#0B1120]/80 p-1.5">
              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
                  selectedPlan === "monthly"
                    ? "bg-amber-400 text-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan("annual")}
                className={`rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
                  selectedPlan === "annual"
                    ? "bg-yellow-300 text-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Anual
              </button>
              <span className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-100">
                {ANNUAL_SAVINGS}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <span className="font-bold">{selectedPlanCopy.title} selecionado:</span>{" "}
            {selectedPlan === "monthly"
              ? "teste grátis de 7 dias e cobrança recorrente após o trial."
              : "melhor custo anual, com economia equivalente a 2 meses."}
          </div>
        </div>

        {statusMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {renderPlanCard("monthly")}
          {renderPlanCard("annual")}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-700/70 bg-[#0B1120]/85 p-5 text-sm leading-6 text-slate-300">
          {SUPPORT_NOTE}
        </div>
      </div>
    </div>
  );
}
