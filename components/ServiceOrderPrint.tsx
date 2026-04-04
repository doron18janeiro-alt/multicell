"use client";

import React, { useEffect, useState } from "react";
import {
  ServiceOrderDocument,
  type DocumentCompanyConfig,
  type ServiceOrderDocumentData,
} from "@/components/ServiceOrderDocument";

const defaultConfig: DocumentCompanyConfig = {
  name: "Minha Empresa",
  cnpj: null,
  document: null,
  address: null,
  phone: null,
  logoUrl: "/wtm-badge.png",
};

export const ServiceOrderPrint = React.forwardRef<
  HTMLDivElement,
  {
    data: ServiceOrderDocumentData;
    config?: DocumentCompanyConfig;
    responsibleName?: string | null;
  }
>(({ data, config: incomingConfig, responsibleName }, ref) => {
  const [config, setConfig] = useState<DocumentCompanyConfig>({
    ...defaultConfig,
    ...incomingConfig,
  });

  useEffect(() => {
    if (!incomingConfig) {
      return;
    }

    setConfig((current) => ({
      ...current,
      ...incomingConfig,
    }));
  }, [incomingConfig]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/config")
      .then((res) => res.json())
      .then((cfg) => {
        if (!isMounted || !cfg || cfg.error) {
          return;
        }

        setConfig((current) => ({
          ...current,
          name: cfg.name || current.name,
          cnpj: cfg.cnpj || cfg.document || current.cnpj || current.document,
          document: cfg.cnpj || cfg.document || current.document,
          address: cfg.address || current.address,
          phone: cfg.phone || current.phone,
          logoUrl: cfg.logoUrl || current.logoUrl,
        }));
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div ref={ref} className="os-print-shell bg-white text-black">
      <style>
        {`
          @page {
            size: A4;
            margin: 10mm;
          }

          .os-print-page {
            box-sizing: border-box;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .os-print-shell {
              background: #ffffff !important;
            }

            .os-print-page {
              width: auto !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .document-paper,
            .document-section,
            .document-summary-card,
            .document-total,
            .document-title-badge {
              background: #ffffff !important;
              box-shadow: none !important;
            }

            .document-paper {
              border-color: #cbd5e1 !important;
              border-radius: 0 !important;
            }

            .document-section,
            .document-summary-card,
            .document-total,
            .document-title-badge {
              border-color: #111827 !important;
            }

            .document-logo {
              filter: grayscale(1) contrast(2) !important;
            }
          }
        `}
      </style>

      <div className="os-print-page mx-auto w-[210mm] min-h-[297mm] bg-white p-[12mm]">
        <ServiceOrderDocument
          data={data}
          config={config}
          className="shadow-none"
          responsibleName={responsibleName}
        />
      </div>
    </div>
  );
});

ServiceOrderPrint.displayName = "ServiceOrderPrint";
