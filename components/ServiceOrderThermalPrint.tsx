import React, { useEffect, useState } from "react";

interface ServiceOrderData {
  id?: number | string;
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  serialNumber?: string;
  problem: string;
  totalPrice?: number;
  createdAt?: string | Date;
}

interface CompanyConfig {
  name: string;
  document: string;
  address: string;
  phone: string;
}

export const ServiceOrderThermalPrint = React.forwardRef<
  HTMLDivElement,
  { data: ServiceOrderData }
>(({ data }, ref) => {
  const [config, setConfig] = useState<CompanyConfig>({
    name: "MULTICELL",
    document: "48.002.640.0001/67",
    address: "Av Paraná, 470 - Bela Vista",
    phone: "(43) 99603-1208",
  });

  useEffect(() => {
    // Fetch config logic if needed, or stick to static/default for now
  }, []);

  return (
    <div
      ref={ref}
      className="bg-white text-black font-mono text-xs w-[80mm] p-4 box-border relative"
    >
      <div className="text-center mb-4">
        <h2 className="font-bold text-lg uppercase">{config.name}</h2>
        <p>{config.address}</p>
        <p>CNPJ: {config.document}</p>
        <p>Tel/WhatsApp: {config.phone}</p>
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="text-center font-bold mb-2 text-sm">
        ORDEM DE SERVIÇO Nº {data.id}
      </div>

      <div className="mb-2">
        <p>
          <span className="font-bold">Cliente:</span> {data.clientName}
        </p>
        <p>{data.clientPhone}</p>
      </div>

      <div className="border-b border-black mb-2 border-dashed"></div>

      <div className="mb-2 space-y-1">
        <p>
          <span className="font-bold">Aparelho:</span> {data.deviceBrand}{" "}
          {data.deviceModel}
        </p>
        <p>
          <span className="font-bold">Serial/IMEI:</span>{" "}
          {data.serialNumber || "-"}
        </p>
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
        <p>
          Data de Entrada:{" "}
          {new Date(data.createdAt || new Date()).toLocaleString()}
        </p>
        <br />
        <p>Obrigado pela preferência!</p>
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
        <p className="text-[10px] uppercase">Multicell Assistência Técnica</p>
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
          TERMO DE GARANTIA MULTICELL: Garantia de {warrantyDays} dias limitada
          a defeitos de fabricação. A garantia NÃO COBRE: danos por quedas,
          telas quebradas, contato com líquidos (oxidação), selos rompidos ou
          reparos por terceiros.
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
