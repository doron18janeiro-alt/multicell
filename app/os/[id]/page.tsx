"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  DollarSign,
  Wrench,
  User,
  Smartphone,
  Calendar,
} from "lucide-react";

export default function OrderDetails() {
  const params = useParams();
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  const router = useRouter();
  const id = params?.id as string;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/os/${id}`);
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = await res.json();
      setOs(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar detalhes da O.S.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizar = async () => {
    // User requested prompt, but I can make a nicer modal later. For now sticking to prompt to match request precisely.
    const valorFinal = prompt(
      "Qual o valor final cobrado (R$)?",
      os.totalPrice?.toString() || "0"
    );
    if (valorFinal === null) return;

    const pecasCusto = prompt(
      "Qual o custo total das peças usadas (R$)?",
      os.costPrice?.toString() || "0"
    );
    if (pecasCusto === null) return;

    try {
      const res = await fetch(`/api/os/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FINALIZADO",
          totalPrice: valorFinal,
          costPrice: pecasCusto,
        }),
      });

      if (res.ok) {
        alert("Serviço finalizado! O lucro foi registrado no Dashboard.");
        fetchOrder(); // Reload data
      } else {
        alert("Erro ao finalizar O.S.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    }
  };

  if (loading)
    return <div className="p-8 text-white">Carregando detalhes...</div>;
  if (!os) return <div className="p-8 text-white">O.S. não encontrada.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/os"
            className="p-2 rounded-full bg-[#112240] text-slate-400 hover:text-[#D4AF37]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Ordem de Serviço #{os.id}
            </h1>
            <p className="text-slate-400 text-sm">
              Criada em {new Date(os.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {os.status !== "FINALIZADO" && (
            <button
              onClick={handleFinalizar}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Finalizar e Lançar
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="btn-outline flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              os.status === "FINALIZADO"
                ? "bg-green-900/30 border border-green-800 text-green-400"
                : "bg-blue-900/30 border border-blue-800 text-blue-400"
            }`}
          >
            <Wrench className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Status Atual: {os.status}</h3>
              <p className="text-sm opacity-80">
                {os.status === "FINALIZADO"
                  ? "Serviço concluído e valores lançados no financeiro."
                  : "O aparelho está em processo de manutenção."}
              </p>
            </div>
          </div>

          {/* Device Info */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Smartphone className="text-[#D4AF37]" size={20} />
              Dados do Aparelho
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase">
                  Marca/Modelo
                </span>
                <p className="font-medium text-white">
                  {os.deviceBrand} {os.deviceModel}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">
                  Serial / IMEI
                </span>
                <p className="font-medium text-white">
                  {os.serialNumber || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">Senha</span>
                <p className="font-medium text-white">
                  {os.devicePassword || "Sem senha"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase">Cor</span>
                <p className="font-medium text-white">
                  {os.deviceColor || "-"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#233554]">
              <span className="text-xs text-slate-400 uppercase">
                Defeito Relatado
              </span>
              <p className="text-white mt-1">{os.problem}</p>
            </div>
            {os.observations && (
              <div className="mt-4 pt-4 border-t border-[#233554]">
                <span className="text-xs text-slate-400 uppercase">
                  Observações Técnicas
                </span>
                <p className="text-white mt-1">{os.observations}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="text-[#D4AF37]" size={20} />
              Cliente
            </h3>
            <p className="font-bold text-white text-lg">{os.clientName}</p>
            <p className="text-slate-400">{os.clientPhone}</p>
            {os.clientCpf && (
              <p className="text-slate-500 text-sm mt-1">CPF: {os.clientCpf}</p>
            )}

            <div className="mt-4 pt-4 border-t border-[#233554]">
              <button
                onClick={() => {
                  const phone = os.clientPhone.replace(/\D/g, "");
                  let statusMessage = "";

                  if (os.status === "PRONTO") {
                    statusMessage =
                      "Seu equipamento já passou pelos nossos testes finais e está pronto para retirada! Recomenda-se trazer este comprovante digital.";
                  } else if (os.status === "ABERTO") {
                    statusMessage =
                      "O diagnóstico técnico foi concluído. Você pode conferir os detalhes e aprovar o serviço respondendo a esta mensagem ou clicando no link abaixo.";
                  } else {
                    statusMessage =
                      "Continuamos trabalhando no reparo do seu aparelho com total prioridade.";
                  }

                  const message = `Olá, ${os.clientName}! 🛠️\n\nAqui é da MULTICELL - Assistência Técnica Especializada. Passando para informar uma atualização na sua Ordem de Serviço:\n\n📄 OS nº: ${os.id}\n📱 Aparelho: ${os.deviceBrand} ${os.deviceModel}\n🚀 Status Atual: 🟢 ${os.status}\n\n${statusMessage}\n\nQualquer dúvida, estamos à disposição. Agradecemos a confiança em nosso trabalho! ✨`;

                  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(
                    message
                  )}`;
                  window.open(url, "_blank");
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Enviar Atualização
              </button>
            </div>
          </div>

          {/* Financial */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="text-[#D4AF37]" size={20} />
              Financeiro
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Cobrado</span>
                <span className="text-green-400 font-bold">
                  R$ {os.totalPrice?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Custo Peças</span>
                <span className="text-red-400">
                  R$ {os.costPrice?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="pt-3 border-t border-[#233554] flex justify-between">
                <span className="text-white font-bold">Lucro Líquido</span>
                <span className="text-[#FFD700] font-bold">
                  R${" "}
                  {(os.servicePrice || os.totalPrice - os.costPrice)?.toFixed(
                    2
                  ) || "0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "none" }}>
        <ServiceOrderPrint ref={componentRef} data={os} />
      </div>
    </div>
  );
}
