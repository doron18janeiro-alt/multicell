"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import {
  DEFAULT_NFE_RECHARGE_AMOUNT,
  LOW_BALANCE_THRESHOLD,
} from "@/lib/nfe-wallet";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

type WalletSnapshot = {
  nfeBalance: number;
};

export function NfeWalletAlertBanner() {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchWallet = async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!active) {
          return;
        }

        setSnapshot({
          nfeBalance: Number(payload?.nfeBalance || 0),
        });
      } catch (requestError) {
        console.error(requestError);
      }
    };

    void fetchWallet();

    return () => {
      active = false;
    };
  }, []);

  const handleRecharge = async () => {
    setLoadingCheckout(true);
    setError("");

    const checkoutWindow =
      typeof window !== "undefined"
        ? window.open("about:blank", "_blank", "noopener,noreferrer")
        : null;

    try {
      const response = await fetch("/api/mercadopago/nfe-wallet/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: DEFAULT_NFE_RECHARGE_AMOUNT,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(
          payload?.error || "Não foi possível iniciar a recarga de saldo.",
        );
      }

      if (checkoutWindow) {
        checkoutWindow.location.href = payload.checkoutUrl;
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch (requestError) {
      if (checkoutWindow) {
        checkoutWindow.close();
      }

      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível iniciar a recarga.",
      );
    } finally {
      setLoadingCheckout(false);
    }
  };

  if (!snapshot || snapshot.nfeBalance >= LOW_BALANCE_THRESHOLD) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-amber-50 shadow-[0_0_18px_rgba(250,204,21,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-400/15 p-2 text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Atenção: seu saldo para emissão está baixo.
            </p>
            <p className="mt-1 text-sm text-amber-100/85">
              Saldo atual: {formatCurrency(snapshot.nfeBalance)}. Recarregue
              para evitar interrupções na emissão de notas fiscais.
            </p>
            {error ? (
              <p className="mt-2 text-xs text-amber-200">{error}</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={handleRecharge}
          disabled={loadingCheckout}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-[#0B1120]/60 px-4 py-3 text-sm font-semibold text-amber-100 transition-colors hover:border-amber-200/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingCheckout ? "Abrindo checkout..." : "Recarregar Agora"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
