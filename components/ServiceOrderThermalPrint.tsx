import React, { useEffect, useState } from "react";

interface ServiceOrderData {
  id?: number | string;
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  serialNumber?: string;
  deviceColor?: string | null;
  problem: string;
  totalPrice?: number;
  createdAt?: string | Date;
  checklist?: any;
}

interface CompanyConfig {
  name: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

export const ServiceOrderThermalPrint = React.forwardRef<
  HTMLDivElement,
  { data: ServiceOrderData }
>(({ data }, ref) => {
  const [config, setConfig] = useState<CompanyConfig>({
    name: "Minha Empresa",
    cnpj: null,
    document: null,
    address: null,
    phone: null,
    logoUrl: "/wtm-float.png",
  });
  const [responsibleName, setResponsibleName] = useState(
    "Responsavel nao informado",
  );

  useEffect(() => {
    let isMounted = true;

    fetch("/api/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!isMounted || !payload) {
          return;
        }

        setConfig((current) => ({
          ...current,
          name: payload.name || current.name,
          cnpj: payload.cnpj || payload.document || current.cnpj,
          document: payload.cnpj || payload.document || current.document,
          address: payload.address || current.address,
          phone: payload.phone || current.phone,
          logoUrl: payload.logoUrl || current.logoUrl,
        }));
      })
      .catch(() => {});

    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!isMounted || !payload) {
          return;
        }

        setResponsibleName(payload.fullName || "Responsavel nao informado");
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedDocument = config.cnpj || config.document;
  const resolvedLogoUrl = config.logoUrl?.trim() || "/wtm-float.png";
  const autoChecklist = data.checklist?.auto;
  const isVehicleOrder = Boolean(autoChecklist?.plate);
  const assetLabel = isVehicleOrder ? "Veículo" : "Aparelho";
  const identifierLabel = isVehicleOrder ? "Placa" : "Serial/IMEI";

  return (
    <div
      ref={ref}
      className="bg-white text-black font-mono text-xs w-[80mm] p-4 box-border relative"
    >
      <div className="text-center mb-4">
        <img
          src={resolvedLogoUrl}
          alt={config.name || "Logo da empresa"}
          className="mx-auto mb-3 max-h-12 w-auto object-contain"
        />
        <h2 className="font-bold text-lg uppercase">{config.name}</h2>
        {config.address ? <p>{config.address}</p> : null}
        {resolvedDocument ? <p>CNPJ: {resolvedDocument}</p> : null}
        {config.phone ? <p>Tel/WhatsApp: {config.phone}</p> : null}
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="text-center font-bold mb-2 text-sm">
        ORDEM DE SERVIÇO Nº {data.id}
      </div>

      <div className="mb-2">
        <p>
          <span className="font-bold">Cliente:</span> {data.clientName}
        </p>
        {data.clientPhone ? <p>{data.clientPhone}</p> : null}
        <p>
          <span className="font-bold">Atendente/Responsavel:</span>{" "}
          {responsibleName}
        </p>
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="mb-2 space-y-1">
        <p>
          <span className="font-bold">{assetLabel}:</span> {data.deviceBrand}{" "}
          {data.deviceModel}
        </p>
        <p>
          <span className="font-bold">{identifierLabel}:</span>{" "}
          {autoChecklist?.plate || data.serialNumber || "-"}
        </p>
        {isVehicleOrder ? (
          <>
            <p>
              <span className="font-bold">Combustível:</span>{" "}
              {autoChecklist?.fuelLevel || "Não informado"}
            </p>
            <p>
              <span className="font-bold">KM Atual:</span>{" "}
              {autoChecklist?.mileage || "Não informado"}
            </p>
          </>
        ) : null}
        <p>
          <span className="font-bold">Problema Relatado:</span>
        </p>
        <p className="bg-gray-100 p-1 rounded">{data.problem}</p>
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      {data.totalPrice !== undefined && data.totalPrice > 0 ? (
        <div className="flex justify-between font-bold text-sm my-2">
          <span>TOTAL ESTIMADO</span>
          <span>R$ {data.totalPrice.toFixed(2)}</span>
        </div>
      ) : (
        <p className="text-center italic my-2">Orçamento Pendente</p>
      )}

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="text-center mt-4 text-[10px]">
        <p className="font-bold mb-1">TERMO DE GARANTIA</p>
        <p className="text-[9px] text-justify leading-tight mb-2">
          {isVehicleOrder
            ? "Garantia legal sobre o serviço executado. A cobertura não inclui mau uso, colisões, acidentes ou intervenções de terceiros."
            : "Garantia de 90 dias para o serviço executado. A garantia será ANULADA em caso de mau uso, quedas, contato com líquidos, oxidação ou selos de segurança rompidos por terceiros."}
        </p>
        <p>
          Data de Entrada:{" "}
          {new Date(data.createdAt || new Date()).toLocaleString()}
        </p>
        <br />
        <p>Obrigado pela preferencia!</p>
        <p>Consulte o status em nosso site.</p>
      </div>
    </div>
  );
});

ServiceOrderThermalPrint.displayName = "ServiceOrderThermalPrint";

export const WarrantyTermPrint = React.forwardRef<
  HTMLDivElement,
  { data: ServiceOrderData; warrantyDays?: number }
>(({ data, warrantyDays = 90 }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white text-black font-mono text-xs w-[80mm] p-4 box-border relative"
    >
      <div className="text-center mb-4">
        <h2 className="font-bold text-lg uppercase">TERMO DE GARANTIA</h2>
        <p className="text-[10px] uppercase">Sua Empresa</p>
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="mb-2">
        <p>
          <span className="font-bold">OS:</span> #{data.id}
        </p>
        <p>
          <span className="font-bold">Cliente:</span> {data.clientName}
        </p>
        <p>
          <span className="font-bold">Aparelho:</span> {data.deviceBrand}{" "}
          {data.deviceModel}
        </p>
        <p>
          <span className="font-bold">Data de Entrega:</span>{" "}
          {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="text-[10px] text-justify space-y-2 mb-4">
        <p>
          Garantia de {warrantyDays} dias limitada ao serviço executado. A
          garantia nao cobre quedas, telas quebradas, contato com liquidos,
          lacres rompidos ou reparos por terceiros.
        </p>
      </div>

      <div className="border-b border-black mb-8 border-dashed"></div>

      <div className="text-center">
        <p>________________________________</p>
        <p className="text-[10px] mt-1">{data.clientName}</p>
        <p className="text-[10px] text-gray-500">(Assinatura do Cliente)</p>
      </div>
    </div>
  );
});

WarrantyTermPrint.displayName = "WarrantyTermPrint";
