"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BellRing, Package, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { buildSupplierRestockMessage, formatWhatsAppLink } from "@/lib/whatsapp";
import { isProductLowStock, resolveProductMinStock } from "@/lib/stock-alerts";
import { useSegment } from "@/hooks/useSegment";

type StockToast = {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  minStock: number;
  supplierName: string | null;
  supplierHref: string | null;
};

export default function AdminStockRealtimeAlerts() {
  const { role, isReady } = useSegment();
  const [toasts, setToasts] = useState<StockToast[]>([]);
  const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const lastToastAtRef = useRef<Map<string, number>>(new Map());
  const enabled = isReady && role === "ADMIN";

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const pushToast = async (productId: string) => {
      const now = Date.now();
      const lastToastAt = lastToastAtRef.current.get(productId) || 0;

      if (now - lastToastAt < 30000) {
        return;
      }

      const response = await fetch(`/api/stock/alerts?productId=${productId}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      const item = payload?.item;

      if (!response.ok || !item) {
        return;
      }

      lastToastAtRef.current.set(productId, now);

      const supplierPhone = item.supplier?.whatsapp || item.supplier?.contact || "";
      const supplierHref = formatWhatsAppLink(
        supplierPhone,
        buildSupplierRestockMessage(item.name),
      );

      const toast: StockToast = {
        id: `${productId}-${now}`,
        productId,
        productName: item.name,
        stock: Number(item.stock || 0),
        minStock: Number(item.minStock || 0),
        supplierName: item.supplier?.name || null,
        supplierHref: supplierHref || null,
      };

      setToasts((current) => [toast, ...current].slice(0, 4));
      window.dispatchEvent(
        new CustomEvent("stock-critical-alert", {
          detail: toast,
        }),
      );

      const timeout = setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== toast.id));
        timeoutMapRef.current.delete(toast.id);
      }, 12000);

      timeoutMapRef.current.set(toast.id, timeout);
    };

    const channel = supabase
      .channel("admin_stock_alerts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const nextProduct = payload.new as Record<string, unknown>;
          const previousProduct = payload.old as Record<string, unknown> | null;

          if (!isProductLowStock(nextProduct)) {
            return;
          }

          const currentStock = Number(nextProduct.stock ?? 0);
          const previousStock = Number(previousProduct?.stock ?? NaN);
          const currentMin = resolveProductMinStock(nextProduct);

          if (Number.isFinite(previousStock) && currentStock >= previousStock) {
            return;
          }

          if (currentStock > currentMin) {
            return;
          }

          void pushToast(String(nextProduct.id || ""));
        },
      )
      .subscribe();

    return () => {
      timeoutMapRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutMapRef.current.clear();
      void channel.unsubscribe();
    };
  }, [enabled]);

  const dismissToast = (toastId: string) => {
    const timeout = timeoutMapRef.current.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutMapRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((entry) => entry.id !== toastId));
  };

  if (!enabled || toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[90] flex w-[calc(100vw-2rem)] max-w-md flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-2xl border border-red-500/30 bg-[#0B1120]/95 p-4 shadow-[0_0_35px_rgba(239,68,68,0.18)] backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-500/10 p-2 text-red-300">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Estoque crítico detectado
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {toast.productName}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {toast.stock} em estoque • mínimo {toast.minStock}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">
              <AlertTriangle className="h-4 w-4" />
              Reposição necessária
            </span>

            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300">
              <Package className="h-4 w-4" />
              {toast.supplierName || "Fornecedor não vinculado"}
            </span>
          </div>

          <div className="mt-4">
            {toast.supplierHref ? (
              <a
                href={toast.supplierHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-[#081c10] transition-colors hover:bg-[#20bd5a]"
              >
                Pedir ao Fornecedor
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-500"
              >
                Pedir ao Fornecedor
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
