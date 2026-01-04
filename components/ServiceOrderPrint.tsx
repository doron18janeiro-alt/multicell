import React from "react";

interface ServiceOrderData {
  id?: number;
  clientName: string;
  clientPhone: string;
  deviceModel: string;
  deviceBrand: string;
  imei: string;
  clientReport: string;
  checklist: any;
  entryDate?: Date;
}

export const ServiceOrderPrint = React.forwardRef<
  HTMLDivElement,
  { data: ServiceOrderData }
>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="p-8 bg-white text-black font-sans"
      style={{ width: "210mm", minHeight: "297mm" }}
    >
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-16 h-16 text-black flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-14 h-14"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12" />
              <path d="M6 12h12" />
              <path d="M9 9l6 6" />
              <path d="M15 9l-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase">MULTICELL</h1>
            <p className="text-sm">
              Av Paraná, 470 - Bairro Bela Vista, Cândido de Abreu (PR)
            </p>
            <p className="text-sm">
              Tel: (43) 99603-1208 | CNPJ: 48.002.640.0001/67
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">ORDEM DE SERVIÇO</h2>
          <p className="text-lg">Nº {data.id || "PENDENTE"}</p>
          <p className="text-sm">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="mb-6 border border-black p-4 rounded">
        <h3 className="font-bold bg-gray-200 p-1 mb-2 uppercase text-sm">
          Dados do Cliente
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <span className="font-bold">Nome:</span> {data.clientName}
          </p>
          <p>
            <span className="font-bold">Telefone:</span> {data.clientPhone}
          </p>
        </div>
      </div>

      {/* Dados do Aparelho */}
      <div className="mb-6 border border-black p-4 rounded">
        <h3 className="font-bold bg-gray-200 p-1 mb-2 uppercase text-sm">
          Dados do Aparelho
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <span className="font-bold">Marca/Modelo:</span> {data.deviceBrand}{" "}
            - {data.deviceModel}
          </p>
          <p>
            <span className="font-bold">IMEI/Serial:</span> {data.imei}
          </p>
        </div>
      </div>

      {/* Relato e Checklist */}
      <div className="mb-6 border border-black p-4 rounded">
        <h3 className="font-bold bg-gray-200 p-1 mb-2 uppercase text-sm">
          Estado do Aparelho
        </h3>
        <div className="mb-4">
          <p className="font-bold text-sm">Relato do Cliente:</p>
          <p className="text-sm italic border-l-2 border-gray-400 pl-2 mt-1">
            {data.clientReport}
          </p>
        </div>
        <div>
          <p className="font-bold text-sm mb-1">Checklist de Entrada:</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold underline mb-1">Estado Físico:</p>
              {data.checklist?.physical &&
                Object.entries(data.checklist.physical).map(
                  ([key, value]) =>
                    value && (
                      <span key={key} className="block">
                        ☑ {key}
                      </span>
                    )
                )}
            </div>
            <div>
              <p className="font-bold underline mb-1">Testes Iniciais:</p>
              {data.checklist?.tests &&
                Object.entries(data.checklist.tests).map(
                  ([key, value]) =>
                    value && (
                      <span key={key} className="block">
                        ☑ {key}
                      </span>
                    )
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Termos */}
      <div className="text-xs text-justify mb-8 border-t border-black pt-4">
        <h3 className="font-bold mb-2">TERMO DE GARANTIA E CONDIÇÕES</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            Garantia de 90 dias para substituição de telas e componentes (exceto
            danos por mau uso, umidade ou quedas).
          </li>
          <li>
            Aparelhos não retirados em até 90 dias após o aviso de conclusão
            serão vendidos para custear as despesas de reparo (Art. 644 do
            Código Civil).
          </li>
          <li>
            A Multicell não se responsabiliza por perda de dados. O backup é de
            responsabilidade do cliente.
          </li>
        </ul>
      </div>

      {/* Assinaturas */}
      <div className="flex justify-between mt-12 pt-8">
        <div className="text-center w-1/3 border-t border-black">
          <p className="text-sm">Assinatura do Cliente</p>
        </div>
        <div className="text-center w-1/3 border-t border-black">
          <p className="text-sm">Assinatura do Técnico/Atendente</p>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        Sistema Multicell - Gerado em {new Date().toLocaleString()}
      </div>
    </div>
  );
});

ServiceOrderPrint.displayName = "ServiceOrderPrint";
