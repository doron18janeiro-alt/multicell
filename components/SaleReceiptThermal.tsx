"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { DocumentBrandHeader } from "@/components/DocumentBrandHeader";
import {
  formatDocumentDate,
  resolveDocumentReferenceDate,
  resolveServiceDocumentTitle,
  resolveWarrantyExpirationDate,
  type ServiceOrderDocumentData,
} from "@/components/ServiceOrderDocument";

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
  address?: string | null;
  document?: string | null;
} | null;

type ReceiptSale = {
  id?: number | string;
  total?: number;
  paymentMethod?: string | null;
  cardType?: string | null;
  createdAt?: string | Date;
  items?: ReceiptItem[];
  customer?: ReceiptCustomer;
  seller?: {
    fullName?: string | null;
    name?: string | null;
  } | null;
} | null;

type WarrantyReceiptData = Pick<
  ServiceOrderDocumentData,
  | "id"
  | "osNumber"
  | "status"
  | "clientName"
  | "clientPhone"
  | "deviceBrand"
  | "deviceModel"
  | "serialNumber"
  | "imei"
  | "observations"
  | "problem"
  | "totalPrice"
  | "createdAt"
  | "updatedAt"
>;

type CompanyReceiptConfig = {
  name: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
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

const hasText = (value?: string | null) => String(value ?? "").trim().length > 0;

const normalizeText = (value?: string | null, fallback = "Não informado") => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
};

const getPaymentLabel = (
  paymentMethod?: string | null,
  cardType?: string | null,
) => {
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

const getPaymentBreakdown = (sale: ReceiptSale) => {
  const totalAmount = Number(sale?.total || 0);
  const normalizedMethod = String(sale?.paymentMethod || "").toUpperCase();
  const isCardMethod =
    normalizedMethod === "CARTAO" ||
    normalizedMethod === "DEBITO" ||
    normalizedMethod === "CREDITO";

  return [
    {
      label: "Dinheiro",
      amount: normalizedMethod === "DINHEIRO" ? totalAmount : 0,
    },
    {
      label: "Pix",
      amount: normalizedMethod === "PIX" ? totalAmount : 0,
    },
    {
      label: "Cartão",
      amount: isCardMethod ? totalAmount : 0,
    },
  ];
};

export const SaleReceiptThermal = React.forwardRef<
  HTMLDivElement,
  {
    sale?: ReceiptSale;
    config: CompanyReceiptConfig;
    termsUrl: string;
    mode?: "sale" | "warranty";
    warranty?: WarrantyReceiptData | null;
    responsibleName?: string | null;
  }
>(({ sale, config, termsUrl, mode = "sale", warranty, responsibleName }, ref) => {
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

  const normalizedLogoUrl = config.logoUrl?.trim() || "/wtm-badge.png";
  const resolvedResponsibleName = normalizeText(
    sale?.seller?.fullName || sale?.seller?.name || responsibleName,
    "Responsavel nao informado",
  );

  if (mode === "warranty") {
    const warrantyData = warranty || null;
    const warrantyTitle = resolveServiceDocumentTitle(warrantyData || {});
    const referenceDate = resolveDocumentReferenceDate(warrantyData || {});
    const expirationDate = resolveWarrantyExpirationDate(warrantyData || {});
    const deviceName = normalizeText(
      `${warrantyData?.deviceBrand || ""} ${warrantyData?.deviceModel || ""}`.trim(),
      "Aparelho não informado",
    );
    const serialNumber = normalizeText(
      warrantyData?.serialNumber || warrantyData?.imei,
    );
    const serviceDescription = normalizeText(
      warrantyData?.observations,
      warrantyData?.problem || "Serviço concluído sem descrição complementar.",
    );
    const totalAmount = Number(warrantyData?.totalPrice || 0);

    return (
      <div
        ref={ref}
        className="receipt-shell w-full max-w-[80mm] overflow-hidden rounded-[26px] border border-slate-200 bg-white text-black shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
      >
        <style>
          {`
            @page {
              size: auto;
              margin: 3mm 2mm;
            }

            .receipt-shell {
              font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .receipt-shell {
                max-width: 80mm !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }

              .receipt-shell .document-paper,
              .receipt-shell .document-section,
              .receipt-shell .document-total,
              .receipt-shell .document-title-badge {
                background: #ffffff !important;
                box-shadow: none !important;
              }

              .receipt-shell .document-section,
              .receipt-shell .document-total,
              .receipt-shell .document-title-badge,
              .receipt-shell .receipt-item {
                border-color: #111827 !important;
              }

              .receipt-shell .document-logo {
                filter: grayscale(1) contrast(2) !important;
              }
            }
          `}
        </style>

        <div className="px-[3.4mm] py-[3.6mm]">
          <div className="document-paper">
            <DocumentBrandHeader
              compact
              companyName={config.name}
              cnpj={config.cnpj}
              document={config.document}
              address={config.address}
              phone={config.phone}
              logoUrl={normalizedLogoUrl}
              title={warrantyTitle}
              subtitle={`Validade até ${formatDocumentDate(expirationDate)}`}
            />

            <div className="space-y-[3mm] pt-[3mm] text-[11px] leading-[1.45]">
              {hasText(warrantyData?.clientName) || hasText(warrantyData?.clientPhone) ? (
                <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Cliente
                  </p>
                  {hasText(warrantyData?.clientName) ? (
                    <p className="mt-[1.2mm] font-semibold text-slate-950">
                      {warrantyData?.clientName}
                    </p>
                  ) : null}
                  {hasText(warrantyData?.clientPhone) ? (
                    <p className="mt-[0.8mm] text-slate-600">
                      {warrantyData?.clientPhone}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Equipamento
                </p>
                <p className="mt-[1.2mm] font-semibold text-slate-950">
                  {deviceName}
                </p>
                <p className="mt-[0.8mm] text-[10px] text-slate-600">
                  IMEI / Serial: {serialNumber}
                </p>
              </section>

              <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Descrição do Serviço
                </p>
                <p className="mt-[1.2mm] text-slate-700">{serviceDescription}</p>
              </section>

              <section className="document-total rounded-[18px] border border-[#FACC15] bg-[#FFFDE7] p-[2.5mm]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B45309]">
                  Valor Total
                </p>
                <div className="mt-[1.2mm] flex items-end justify-between gap-3">
                  <div className="text-[10px] text-slate-600">
                    Entrega: {formatDocumentDate(referenceDate)}
                  </div>
                  <p className="text-[16px] font-black tracking-[0.04em] text-slate-950">
                    {totalAmount > 0 ? formatCurrency(totalAmount) : "A definir"}
                  </p>
                </div>
              </section>

              <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Garantia
                </p>
                <div className="mt-[2mm] space-y-[1.4mm] text-slate-700">
                  <p>Vendedor/Responsável: {resolvedResponsibleName}</p>
                  <p>Emissão: {formatDocumentDate(referenceDate)}</p>
                  <p>Validade: {formatDocumentDate(expirationDate)}</p>
                </div>
              </section>

              <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm] text-[10px] leading-[1.55] text-slate-600">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Cláusulas
                </p>
                <div className="mt-[2mm] space-y-[1.4mm]">
                  <p>
                    Garantia de 90 dias (Art. 26 CDC) sobre o serviço
                    executado.
                  </p>
                  <p>
                    A garantia não cobre mau uso, quedas, contato com líquidos
                    ou lacre rompido.
                  </p>
                </div>
              </section>

              <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm] text-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code para termos e condições"
                    className="mx-auto h-[28mm] w-[28mm]"
                  />
                ) : null}
                <p className="mt-[2mm] break-all text-[10px] text-slate-500">
                  Termos e condições: {termsUrl}
                </p>
              </section>

              <p className="pb-[1mm] text-center text-[11px] font-semibold text-slate-900">
                Obrigado pela preferencia! ✨
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = sale?.items || [];
  const customerName = sale?.customer?.name || "";
  const customerPhone = sale?.customer?.phone || "";
  const customerAddress = sale?.customer?.address || "";
  const paymentLabel = getPaymentLabel(sale?.paymentMethod, sale?.cardType);
  const paymentBreakdown = getPaymentBreakdown(sale);
  const saleDate = formatDateTime(sale?.createdAt);
  const totalAmount = Number(sale?.total || 0);
  const hasCustomerDetails =
    hasText(customerName) || hasText(customerPhone) || hasText(customerAddress);

  return (
    <div
      ref={ref}
      className="receipt-shell w-full max-w-[80mm] overflow-hidden rounded-[26px] border border-slate-200 bg-white text-black shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
    >
      <style>
        {`
          @page {
            size: auto;
            margin: 3mm 2mm;
          }

          .receipt-shell {
            font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .receipt-shell {
              max-width: 80mm !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }

            .receipt-shell .document-paper,
            .receipt-shell .document-section,
            .receipt-shell .document-total,
            .receipt-shell .document-title-badge {
              background: #ffffff !important;
              box-shadow: none !important;
            }

            .receipt-shell .document-section,
            .receipt-shell .document-total,
            .receipt-shell .document-title-badge,
            .receipt-shell .receipt-item {
              border-color: #111827 !important;
            }

            .receipt-shell .document-logo {
              filter: grayscale(1) contrast(2) !important;
            }
          }
        `}
      </style>

      <div className="px-[3.4mm] py-[3.6mm]">
        <div className="document-paper">
          <DocumentBrandHeader
            compact
            companyName={config.name}
            cnpj={config.cnpj}
            document={config.document}
            address={config.address}
            phone={config.phone}
            logoUrl={normalizedLogoUrl}
            title={`RECIBO DE VENDA #${sale?.id || "-"}`}
            subtitle={saleDate}
          />

          <div className="space-y-[3mm] pt-[3mm] text-[11px] leading-[1.45]">
            <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Cliente
                  </p>
                  {hasCustomerDetails ? (
                    <>
                      {hasText(customerName) ? (
                        <p className="mt-[1.2mm] font-semibold text-slate-950">
                          {customerName}
                        </p>
                      ) : null}
                      {hasText(customerPhone) ? (
                        <p className="mt-[0.8mm] text-slate-600">
                          {customerPhone}
                        </p>
                      ) : null}
                      {hasText(customerAddress) ? (
                        <p className="mt-[0.8mm] text-slate-600">
                          {customerAddress}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-[1.2mm] text-slate-600">Consumidor final</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Vendedor/Responsável
                  </p>
                  <p className="mt-[1.2mm] max-w-[28mm] text-[10px] font-semibold leading-[1.4] text-slate-950">
                    {resolvedResponsibleName}
                  </p>
                </div>
              </div>
            </section>

            <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
              <div className="mb-[2mm] flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>Itens da venda</span>
                <span>{items.length}</span>
              </div>

              <div className="space-y-[2mm]">
                {items.length > 0 ? (
                  items.map((item, index) => {
                    const description =
                      item.product?.name ||
                      item.description ||
                      `Item ${index + 1}`;
                    const itemTotal =
                      Number(item.unitPrice || 0) * Number(item.quantity || 0);

                    return (
                      <div
                        key={item.id || `${description}-${index}`}
                        className="receipt-item border-b border-dotted border-slate-300 pb-[2mm] last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-950">
                              {description}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {item.quantity} x {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className="whitespace-nowrap pl-2 text-[11px] font-semibold text-slate-950">
                            {formatCurrency(itemTotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500">Nenhum item registrado.</p>
                )}
              </div>
            </section>

            <section className="document-total rounded-[18px] border border-[#FACC15] bg-[#FFFDE7] p-[2.5mm]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B45309]">
                Total
              </p>
              <div className="mt-[1.2mm] flex items-end justify-between gap-3">
                <div className="text-[10px] text-slate-600">
                  Forma registrada: {paymentLabel}
                </div>
                <p className="text-[16px] font-black tracking-[0.04em] text-slate-950">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </section>

            <section className="document-section rounded-[18px] border border-slate-200 bg-white p-[2.5mm]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pagamento
              </p>
              <div className="mt-[2mm] space-y-[1.4mm]">
                {paymentBreakdown.map((payment) => (
                  <div
                    key={payment.label}
                    className="flex items-center justify-between border-b border-dashed border-slate-200 pb-[1.4mm] last:border-b-0 last:pb-0"
                  >
                    <span className="text-slate-600">{payment.label}</span>
                    <span
                      className={
                        payment.amount > 0
                          ? "font-semibold text-slate-950"
                          : "text-slate-400"
                      }
                    >
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <p className="pb-[1mm] text-center text-[11px] font-semibold text-slate-900">
              Obrigado pela preferência! ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

SaleReceiptThermal.displayName = "SaleReceiptThermal";
