import React, { useEffect, useState } from "react";
import { User, Smartphone } from "lucide-react";

interface ServiceOrderData {
  id?: number | string;
  osNumber?: number;
  clientName: string;
  clientPhone: string;
  clientCpf?: string;
  deviceModel: string;
  deviceBrand: string;
  serialNumber?: string;
  imei?: string; // Legacy support
  problem: string;
  observations?: string;
  checklist?: any;
  createdAt?: string | Date;
  totalPrice?: number;
}

interface CompanyConfig {
  name: string;
  document: string;
  address: string;
  phone: string;
}

export const ServiceOrderPrint = React.forwardRef<
  HTMLDivElement,
  { data: ServiceOrderData }
>(({ data }, ref) => {
  const [config, setConfig] = useState<CompanyConfig>({
    name: "Multicell",
    document: "48.002.640.0001/67",
    address: "Av Paraná, 470 - Bela Vista - Cândido de Abreu (PR)",
    phone: "(43) 99603-1208",
  });

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg && !cfg.error) {
          setConfig({
            name: cfg.name || "Multicell",
            document: cfg.document || config.document,
            address: cfg.address || config.address,
            phone: cfg.phone || config.phone,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div
      ref={ref}
      className="bg-white text-black font-sans box-border relative"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "40px",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
            @page { margin: 0; }
            body { -webkit-print-color-adjust: exact; }
        }
      `,
        }}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          {/* Logo - Assuming /logo.png exists in public folder */}
          <img
            src="/logo.png"
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="text-right">
          <h1 className="text-xl font-black uppercase tracking-tighter text-gray-900 leading-none">
            MULTICELL
          </h1>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">
            Assistência Técnica Especializada
          </p>
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>{config.address}</p>
            <p>CNPJ: {config.document}</p>
            <p className="font-bold">WhatsApp: {config.phone}</p>
          </div>
        </div>
      </div>

      {/* TÍTULO E PROTOCOLO */}
      <div className="flex justify-between items-end mb-6 border-b-2 border-black pb-2">
        <div>
          <h2 className="text-2xl font-bold uppercase">Ordem de Serviço</h2>
          <p className="text-xs text-gray-500">
            Documento de Entrada e Garantia
          </p>
        </div>
        <div className="text-right">
          <div className="bg-black text-white px-3 py-1 rounded text-sm font-bold font-mono mb-1">
            {String(data.id || data.osNumber || "---").length > 6
              ? data.id || data.osNumber
              : String(data.id || data.osNumber || "---").padStart(6, "0")}
          </div>
          <p className="text-xs font-bold">
            Data:{" "}
            {data.createdAt
              ? new Date(data.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* CORPO DO DOCUMENTO Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* DADOS DO CLIENTE */}
        <div className="border border-gray-300 rounded-sm">
          <div className="bg-gray-100 px-3 py-1 border-b border-gray-300 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-gray-700">
              Dados do Cliente
            </h3>
            <User size={12} className="text-gray-500" />
          </div>
          <div className="p-3 grid grid-cols-12 gap-y-2 text-sm">
            <div className="col-span-8">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Nome Completo
              </p>
              <p className="font-semibold truncate">{data.clientName}</p>
            </div>
            <div className="col-span-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                CPF/CNPJ
              </p>
              <p className="font-medium">{data.clientCpf || "---"}</p>
            </div>
            <div className="col-span-12">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Contato
              </p>
              <p className="font-medium">{data.clientPhone}</p>
            </div>
          </div>
        </div>

        {/* DADOS DO EQUIPAMENTO */}
        <div className="border border-gray-300 rounded-sm">
          <div className="bg-gray-100 px-3 py-1 border-b border-gray-300 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-gray-700">
              Equipamento & Serviço
            </h3>
            <Smartphone size={12} className="text-gray-500" />
          </div>
          <div className="p-3 grid grid-cols-12 gap-4 text-sm">
            <div className="col-span-6">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Modelo/Marca
              </p>
              <p className="font-semibold uppercase">
                {data.deviceBrand} {data.deviceModel}
              </p>
            </div>
            <div className="col-span-6">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                IMEI / Serial
              </p>
              <p className="font-mono text-xs">
                {data.serialNumber || data.imei || "---"}
              </p>
            </div>

            <div className="col-span-12 bg-red-50 p-2 rounded border border-red-100">
              <p className="text-[10px] text-red-500 uppercase font-bold">
                Defeito Relatado
              </p>
              <p className="font-bold text-red-700">{data.problem}</p>
            </div>

            <div className="col-span-12">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                Observações / Acessórios
              </p>
              <p className="text-xs text-gray-600">
                {data.observations || "Nenhuma observação."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TERMOS LEGAIS */}
      <div className="mt-8">
        <h4 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-1">
          Termos e Garantia
        </h4>
        <div className="text-[10px] leading-relaxed text-justify text-gray-600 grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2">
              <strong>1. GARANTIA (90 DIAS):</strong> Garantia legal sobre peças
              e mão de obra a partir da data de entrega (Art. 26 CDC).{" "}
              <strong>Não cobre:</strong> quebras, líquidos, mau uso ou violação
              de selos.
            </p>
            <p>
              <strong>2. PERDA DE DADOS:</strong> A empresa não se
              responsabiliza por dados. O backup é responsabilidade do cliente.
            </p>
          </div>
          <div>
            <p className="mb-2">
              <strong>3. ABANDONO:</strong> Aparelhos prontos não retirados em
              90 dias serão vendidos para custeio (Art. 1.275 Código Civil).
            </p>
            <p>
              <strong>4. AUTORIZAÇÃO:</strong> Ao deixar o aparelho, o cliente
              autoriza os testes técnicos e concorda com os termos acima.
            </p>
          </div>
        </div>
      </div>

      {/* ASSINATURA TECNICO - CENTRALIZADA */}
      <div className="absolute bottom-32 left-0 w-full">
        <div className="flex justify-center">
          <div className="text-center w-64">
            {/* Linha de assinatura */}
            <div className="border-b border-black mb-2"></div>
            <p className="text-xs font-bold uppercase">Técnico Responsável</p>
            <p className="text-[9px] text-gray-500">
              Multicell - Cândido de Abreu
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-8 left-0 w-full text-center border-t border-gray-100 pt-4">
        <p className="text-[9px] text-gray-400">
          Este documento não vale como nota fiscal. | Impresso em{" "}
          {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
});

// Import icons to avoid errors if they are used but not imported in the component
// Since I copied the whole component body, I verified I used User and Smartphone, so I need to make sure they are imported.
// The file imports React... but symbols like User, Smartphone might not be imported if I just replace the body?
// Ah, `replace_string` replaces only the matched range. I need to check if those icons are imported at the top.
// The original file imported `User, Smartphone`? Let's check.
// Original file (Line 4) imports: `import { ... } from "lucide-react";` - No, it did NOT import User, Smartphone IN THIS FILE?
// Wait, `ServiceOrderPrint.tsx` imports?
// Let me read imports of `components/ServiceOrderPrint.tsx` first.

ServiceOrderPrint.displayName = "ServiceOrderPrint";
