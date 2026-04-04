"use client";

import React from "react";
import { DocumentBrandHeader } from "@/components/DocumentBrandHeader";
import { formatCurrency } from "@/lib/food";

type StatementConfig = {
  name: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

type StatementCustomer = {
  name: string;
  phone?: string | null;
  document?: string | null;
};

type StatementEntry = {
  id: string;
  amount: number;
  createdAt: string;
  dueDate?: string | null;
  status: string;
  description?: string | null;
  order?: {
    tableNumber?: string | null;
  } | null;
  itemsSnapshot: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    consumedAt?: string | null;
  }>;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Não informado";
  }

  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Sem vencimento";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
};

export const FoodConsumptionStatement = React.forwardRef<
  HTMLDivElement,
  {
    config: StatementConfig;
    customer: StatementCustomer | null;
    entries: StatementEntry[];
  }
>(({ config, customer, entries }, ref) => {
  const totalAmount = entries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const openEntries = entries.filter((entry) => entry.status !== "PAGO").length;

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white text-slate-950 shadow-[0_32px_80px_rgba(15,23,42,0.14)]"
    >
      <style>
        {`
          @page {
            size: A4;
            margin: 14mm;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .food-statement-shell {
              max-width: 100% !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      <div className="food-statement-shell px-8 py-8">
        <DocumentBrandHeader
          companyName={config.name}
          cnpj={config.cnpj}
          document={config.document}
          address={config.address}
          phone={config.phone}
          logoUrl={config.logoUrl}
          title="Extrato de Consumo"
          subtitle={`Gerado em ${new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}`}
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Cliente
            </p>
            <p className="mt-3 text-lg font-bold text-slate-950">
              {customer?.name || "Consumidor"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Telefone: {customer?.phone || "Não informado"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              CPF/CNPJ: {customer?.document || "Não informado"}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Total em Aberto
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {formatCurrency(totalAmount)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {openEntries} lançamento(s) pendente(s)
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Conferência
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Documento não fiscal emitido apenas para conferência do histórico de consumo.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
              Nenhum lançamento registrado para este cliente.
            </div>
          ) : (
            entries.map((entry) => (
              <section
                key={entry.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Lançamento #{entry.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {entry.description || "Consumo registrado"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>Data: {formatDateTime(entry.createdAt)}</span>
                      <span>Mesa: {entry.order?.tableNumber || "Balcão"}</span>
                      <span>Vencimento: {formatDate(entry.dueDate)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                        entry.status === "VENCIDO"
                          ? "bg-red-500/15 text-red-600"
                          : entry.status === "PAGO"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                    <p className="mt-3 text-2xl font-black text-slate-950">
                      {formatCurrency(entry.amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Hora/Registro</th>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 font-semibold text-center">Qtd.</th>
                        <th className="px-4 py-3 font-semibold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.itemsSnapshot.map((item, index) => (
                        <tr key={`${entry.id}-${index}`} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-slate-500">
                            {formatDateTime(item.consumedAt || entry.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

FoodConsumptionStatement.displayName = "FoodConsumptionStatement";
