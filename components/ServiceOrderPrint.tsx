import React, { useEffect, useState } from "react";

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
    // Attempt to load dynamic config if available
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
      className="p-8 bg-white text-black font-sans box-border"
      style={{ width: "210mm", minHeight: "297mm", margin: "0 auto" }}
    >
      {/* 2 Copies per page if needed, but standard is usually 1 full page for legal terms. 
          Let's do one nice copy with big legal text. */}

      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="border-2 border-black p-2 rounded-lg">
            <h1 className="text-3xl font-black tracking-tighter uppercase">
              MULTICELL
            </h1>
          </div>
          <div>
            <p className="font-bold text-sm">{config.address}</p>
            <p className="text-sm">CNPJ: {config.document}</p>
            <p className="text-sm">Tel/WhatsApp: {config.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold">ORDEM DE SERVIÇO</h2>
          <span className="text-xs font-bold block">E TERMO DE GARANTIA</span>
          <p className="text-xl font-mono bg-gray-200 px-2 mt-1 inline-block">
            Nº {String(data.id || data.osNumber).padStart(6, "0")}
          </p>
          <p className="text-sm mt-1">
            Data:{" "}
            {data.createdAt
              ? new Date(data.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded">
            Cliente
          </span>
          <div className="h-px bg-black flex-1"></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border border-black p-3 rounded-lg bg-gray-50">
          <div className="flex gap-2">
            <span className="font-bold w-16">Nome:</span>{" "}
            <span className="uppercase">{data.clientName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-16">Fone:</span>{" "}
            <span>{data.clientPhone}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-16">CPF:</span>{" "}
            <span>{data.clientCpf || "_________________"}</span>
          </div>
        </div>
      </div>

      {/* EQUIPAMENTO */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded">
            Equipamento
          </span>
          <div className="h-px bg-black flex-1"></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border border-black p-3 rounded-lg bg-gray-50">
          <div className="flex gap-2">
            <span className="font-bold w-16">Aparelho:</span>{" "}
            <span className="uppercase">
              {data.deviceBrand} {data.deviceModel}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-16">IMEI/SN:</span>{" "}
            <span>{data.serialNumber || data.imei || "_________________"}</span>
          </div>
          <div className="col-span-2 flex gap-2">
            <span className="font-bold w-16">Defeito:</span>{" "}
            <span className="uppercase font-bold">{data.problem}</span>
          </div>
          <div className="col-span-2 flex gap-2">
            <span className="font-bold w-16">Obs:</span>{" "}
            <span className="uppercase">
              {data.observations || "Sem observações."}
            </span>
          </div>
        </div>
      </div>

      {/* CHECKLIST / CONDICOES */}
      <div className="mb-6">
        <div className="border border-black p-4 rounded-lg bg-gray-50">
          <h3 className="font-bold text-sm mb-2 text-center decoration-double underline">
            TERMO DE GARANTIA E CONDIÇÕES DE SERVIÇO
          </h3>
          <ol className="text-[10px] space-y-1 list-decimal list-inside text-justify leading-snug">
            <li>
              <strong>GARANTIA DE 90 DIAS:</strong> Conforme Art. 26 do Código
              de Defesa do Consumidor, a garantia legal é de 90 dias para
              defeitos de peças substituídas ou mão de obra, contados a partir
              da data de entrega.
            </li>
            <li>
              A garantia <strong>NÃO COBRE</strong>: Dano físico (quebra de
              tela/vidro), contato com líquidos (mesmo em aparelhos resistentes
              à água), mau uso, software, instalações de terceiros ou se o selo
              de garantia for rompido.
            </li>
            <li>
              <strong>PERDA DE DADOS:</strong> A empresa NÃO SE RESPONSABILIZA
              por perda de dados (fotos, contatos, etc) durante o reparo de
              software ou hardware. O cliente declara ter feito backup prévio.
            </li>
            <li>
              <strong>ABANDONO:</strong> Equipamentos prontos e não retirados no
              prazo de <strong>90 DIAS</strong> serão considerados abandonados e
              poderão ser vendidos para cobrir custos de peças e armazenagem
              (Art. 1.275 do Código Civil Brasileiro).
            </li>
            <li>
              <strong>ORÇAMENTO:</strong> O valor passado é uma estimativa. Caso
              sejam encontrados outros defeitos durante o reparo, o cliente será
              comunicado para nova aprovação.
            </li>
            <li className="font-bold">
              Ao assinar, o cliente declara estar ciente e de acordo com todas
              as supracitadas condições.
            </li>
          </ol>
        </div>
      </div>

      {/* ASSINATURAS */}
      <div className="mt-8 grid grid-cols-2 gap-12">
        <div className="text-center">
          <div className="border-b border-black mb-2 mx-4 relative top-4"></div>
          <p className="text-xs font-bold uppercase mt-4">
            Assinatura do Técnico
          </p>
        </div>
        <div className="text-center">
          <div className="border-b border-black mb-2 mx-4 relative top-4"></div>
          <p className="text-xs font-bold uppercase mt-4">
            Assinatura do Cliente
          </p>
          <p className="text-[9px] text-gray-500">{data.clientName}</p>
        </div>
      </div>

      {/* FOOTER - CANHOTO OPTIONAL OR JUST INFO */}
      <div className="mt-auto pt-6 border-t border-dashed border-gray-400 text-center text-[10px] text-gray-500">
        <p>Sistema Multicell - Desenvolvido para Excelência Técnica</p>
        <p>{new Date().toLocaleString()}</p>
      </div>
    </div>
  );
});

ServiceOrderPrint.displayName = "ServiceOrderPrint";
