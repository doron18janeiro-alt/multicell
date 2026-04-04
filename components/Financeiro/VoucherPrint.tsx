"use client";

import { formatCpf } from "@/lib/cpf";

export type VoucherPrintData = {
  employeeName: string;
  employeeCpf: string;
  grossSalary: number;
  advanceAmount: number;
  remainingSalary: number;
  createdAt: string | Date;
  referenceMonth?: string | Date | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

const formatMonth = (value?: string | Date | null) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "long",
    year: "numeric",
  })
    .format(new Date(value))
    .replace(/^\w/, (character) => character.toUpperCase());
};

const formatPaymentMethod = (value?: string | null) => {
  if (!value) {
    return "Nao informado";
  }

  const normalized = value.toUpperCase();

  if (normalized === "DINHEIRO") return "Dinheiro";
  if (normalized === "PIX") return "Pix";
  if (normalized === "CARTAO") return "Cartao";

  return value;
};

export function VoucherPrint({
  companyName,
  voucher,
}: {
  companyName: string;
  voucher: VoucherPrintData;
}) {
  return (
    <div className="voucher-receipt w-full max-w-[80mm] overflow-hidden rounded-[22px] border border-slate-200 bg-white text-black shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
      <style>{`
        .voucher-receipt {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        @media print {
          html, body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #ffffff;
          }

          .voucher-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="border-b border-dashed border-slate-300 px-5 py-4 text-center">
        <p className="text-[15px] font-black uppercase tracking-[0.18em]">
          {companyName}
        </p>
        <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.22em]">
          Comprovante de Adiantamento
        </p>
      </div>

      <div className="space-y-3 px-5 py-4 text-[12px] leading-5">
        <div>
          <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
            Funcionario
          </p>
          <p className="mt-1 font-semibold">{voucher.employeeName}</p>
        </div>

        <div>
          <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
            CPF
          </p>
          <p className="mt-1 font-semibold">
            {formatCpf(voucher.employeeCpf)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
              Valor
            </p>
            <p className="mt-1 font-semibold">
              {formatCurrency(voucher.advanceAmount)}
            </p>
          </div>

          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
              Salario Base
            </p>
            <p className="mt-1 font-semibold">
              {formatCurrency(voucher.grossSalary)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
              Restante do Mes
            </p>
            <p className="mt-1 font-semibold">
              {formatCurrency(voucher.remainingSalary)}
            </p>
          </div>

          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
              Pagamento
            </p>
            <p className="mt-1 font-semibold">
              {formatPaymentMethod(voucher.paymentMethod)}
            </p>
          </div>
        </div>

        {voucher.referenceMonth ? (
          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
              Mes de Referencia
            </p>
            <p className="mt-1 font-semibold">
              {formatMonth(voucher.referenceMonth)}
            </p>
          </div>
        ) : null}

        <div>
          <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
            Data e Hora
          </p>
          <p className="mt-1 font-semibold">
            {formatDateTime(voucher.createdAt)}
          </p>
        </div>

        {voucher.notes ? (
          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-slate-500">
              Observacoes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5">
              {voucher.notes}
            </p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-dashed border-slate-300 px-5 py-5">
        <div className="mt-8 border-t border-slate-500 pt-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-600">
          Assinatura do Funcionario
        </div>
      </div>
    </div>
  );
}
