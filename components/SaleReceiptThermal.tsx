"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type ReceiptItem = {
  id?: number | string;
  quantity: number;
  unitPrice: number;
  description?: string | null;
  product?: {
    name?: string | null;
  } | null;
};

type ReceiptCustomer = {
  name?: string | null;
  phone?: string | null;
} | null;

type ReceiptSale = {
  id?: number | string;
  total?: number;
  paymentMethod?: string | null;
  cardType?: string | null;
  createdAt?: string | Date;
  items?: ReceiptItem[];
  customer?: ReceiptCustomer;
} | null;

type CompanyReceiptConfig = {
  name: string;
  document: string;
  address: string;
  phone: string;
  logoUrl: string;
};

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDateTime = (value?: string | Date) => {
  const parsedDate = value ? new Date(value) : new Date();
  return parsedDate.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
};

const getPaymentLabel = (paymentMethod?: string | null, cardType?: string | null) => {
  if (!paymentMethod) {
    return "Não informado";
  }

  const normalizedMethod = paymentMethod.toUpperCase();
  const normalizedCardType = cardType?.toUpperCase() || "";

  if (normalizedMethod === "CARTAO" && normalizedCardType === "DEBITO") {
    return "Cartão Débito";
  }

  if (normalizedMethod === "CARTAO" && normalizedCardType === "CREDITO") {
    return "Cartão Crédito";
  }

  if (normalizedMethod === "DINHEIRO") {
    return "Dinheiro";
  }

  if (normalizedMethod === "PIX") {
    return "Pix";
  }

  if (normalizedMethod === "DEBITO") {
    return "Cartão Débito";
  }

  if (normalizedMethod === "CREDITO") {
    return "Cartão Crédito";
  }

  return paymentMethod;
};

export const SaleReceiptThermal = React.forwardRef<
  HTMLDivElement,
  {
    sale: ReceiptSale;
    config: CompanyReceiptConfig;
    termsUrl: string;
  }
>(({ sale, config, termsUrl }, ref) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  useEffect(() => {
    if (!termsUrl) {
      setQrCodeDataUrl("");
      return;
    }

    QRCode.toDataURL(termsUrl, {
      width: 132,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then(setQrCodeDataUrl)
      .catch((error) => {
        console.error("[SaleReceiptThermal] QR Code error:", error);
        setQrCodeDataUrl("");
      });
  }, [termsUrl]);

  const items = sale?.items || [];
  const customerName = sale?.customer?.name || "Consumidor Final";
  const customerPhone = sale?.customer?.phone || "";
  const paymentLabel = getPaymentLabel(sale?.paymentMethod, sale?.cardType);
  const saleDate = formatDateTime(sale?.createdAt);

  const normalizedLogoUrl = useMemo(
    () => config.logoUrl?.trim() || "/logo.png",
    [config.logoUrl],
  );
  const supportPhone = config.phone?.trim() || "(43) 99603-1208";

  return (
    <div
      ref={ref}
      className="receipt-shell w-full max-w-[80mm] overflow-hidden rounded-[22px] border border-slate-200 bg-white text-black shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
    >
      <style>
        {`
          @page {
            size: auto;
            margin: 2mm;
          }

          .receipt-shell {
            font-family: "Courier New", monospace;
          }

          @media print {
            .receipt-shell {
              max-width: 80mm !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }

            .receipt-accent {
              background: #000 !important;
              color: #fff !important;
            }

            .receipt-total {
              background: #f3f4f6 !important;
              border-color: #d1d5db !important;
            }

            .receipt-logo {
              filter: grayscale(1) contrast(1.1);
            }
          }
        `}
      </style>

      <div className="receipt-accent bg-[#FACC15] px-[3mm] py-[2.5mm] text-center text-[13px] font-black uppercase tracking-[0.2em] text-[#111827]">
        Recibo de Venda
      </div>

      <div className="p-[3mm]">
        <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
          <div className="text-center">
            {normalizedLogoUrl ? (
              <img
                src={normalizedLogoUrl}
                alt={config.name}
                className="receipt-logo mx-auto mb-2 max-h-10 w-auto object-contain"
              />
            ) : null}

            <p className="text-[13px] font-bold uppercase">{config.name}</p>
            {config.document ? <p>CNPJ: {config.document}</p> : null}
            {config.address ? <p>{config.address}</p> : null}
            {config.phone ? <p>Telefone: {config.phone}</p> : null}
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="text-center">
            <p className="font-bold uppercase tracking-[0.12em]">
              RECIBO DE VENDA
            </p>
            <p>Venda #{sale?.id || "-"}</p>
            <p>{saleDate}</p>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1">
            <p>
              <span className="font-bold">Cliente:</span> {customerName}
            </p>
            {customerPhone ? (
              <p>
                <span className="font-bold">Telefone:</span> {customerPhone}
              </p>
            ) : null}
            <p>
              <span className="font-bold">Pagamento:</span> {paymentLabel}
            </p>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="grid grid-cols-[30px_1fr_78px] gap-2 border-b border-black pb-1 text-[10px] font-bold uppercase">
            <span>Qtd</span>
            <span>Descrição</span>
            <span className="text-right">Valor</span>
          </div>

          <div className="space-y-2 py-2">
            {items.map((item, index) => {
              const description =
                item.product?.name ||
                item.description ||
                `Item ${index + 1}`;
              const itemTotal =
                Number(item.unitPrice || 0) * Number(item.quantity || 0);

              return (
                <div
                  key={item.id || `${description}-${index}`}
                  className="grid grid-cols-[30px_1fr_78px] gap-2"
                >
                  <span>{item.quantity}</span>
                  <span className="break-words">{description}</span>
                  <span className="text-right">{formatCurrency(itemTotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="receipt-total rounded-xl border border-slate-300 bg-slate-100 px-3 py-3">
            <div className="flex items-center justify-between text-[13px] font-bold">
              <span>TOTAL</span>
              <span>{formatCurrency(sale?.total)}</span>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-2 text-[10px] leading-[1.45]">
            <p>
              Garantia legal de 90 dias (Art. 26 do CDC) para defeitos de fabricação.
            </p>
            <p>
              Trocas em até 7 dias com este recibo e embalagem original intacta.
            </p>
            <p>
              A garantia não cobre danos por líquidos, quedas ou abertura do aparelho
              por terceiros.
            </p>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="text-center">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code para termos e condições"
                className="mx-auto h-[32mm] w-[32mm]"
              />
            ) : null}
            <p className="mt-2 text-[10px]">Termos e condições: {termsUrl}</p>
          </div>

          <div className="mt-4 text-center text-[10px] leading-[1.5]">
            <p>
              Agradecemos a preferência! Dúvidas? Entre em contato: {supportPhone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

SaleReceiptThermal.displayName = "SaleReceiptThermal";
