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

  return (
    <div
      ref={ref}
      className="bg-white text-black font-mono text-[11px] leading-[1.4] w-full max-w-[80mm] p-[3mm]"
    >
      <style>
        {`
          @page {
            size: auto;
            margin: 2mm;
          }
        `}
      </style>

      <div className="text-center">
        {normalizedLogoUrl ? (
          <img
            src={normalizedLogoUrl}
            alt={config.name}
            className="mx-auto mb-2 max-h-10 w-auto object-contain grayscale"
          />
        ) : null}

        <p className="text-[13px] font-bold uppercase">{config.name}</p>
        {config.document ? <p>CNPJ: {config.document}</p> : null}
        {config.address ? <p>{config.address}</p> : null}
        {config.phone ? <p>Telefone: {config.phone}</p> : null}
      </div>

      <div className="my-3 border-t border-dashed border-black" />

      <div className="text-center">
        <p className="font-bold uppercase">Recibo de Venda</p>
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
          const itemTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);

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

      <div className="border-t border-black pt-2">
        <div className="flex items-center justify-between text-[12px] font-bold">
          <span>Total</span>
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
        <p>Pagamento realizado via Mercado Pago.</p>
        <p>Obrigado pela preferência! ✨</p>
      </div>
    </div>
  );
});

SaleReceiptThermal.displayName = "SaleReceiptThermal";
