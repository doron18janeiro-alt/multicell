"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  DollarSign,
  Wrench,
  User,
  Smartphone,
} from "lucide-react";

export default function OrderDetails() {
  const params = useParams();
  const id = params?.id as string;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

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
          totalPrice: parseFloat(valorFinal.replace(",", ".")),
          costPrice: parseFloat(pecasCusto.replace(",", ".")),
        }),
      });

      if (res.ok) {
        alert("Serviço finalizado! O lucro foi registrado no Dashboard.");
        fetchOrder();
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
              Ordem de Serviço #{os.osNumber}
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
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
            >
              <CheckCircle size={18} />
              Finalizar e Lançar
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="bg-[#D4AF37] hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-yellow-900/20"
          >
            <Printer size={18} /> Imprimir O.S.
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
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800 shadow-xl">
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
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800 shadow-xl">
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
              <Link
                href={`https://wa.me/55${os.clientPhone.replace(/\D/g, "")}`}
                target="_blank"
                className="text-green-400 hover:text-green-300 text-sm font-bold flex items-center gap-1"
              >
                Abrir WhatsApp
              </Link>
            </div>
          </div>

          {/* Financial */}
          <div className="bg-[#112240] p-6 rounded-xl border border-slate-800 shadow-xl">
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
                  R$ {((os.totalPrice || 0) - (os.costPrice || 0))?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <ServiceOrderPrint ref={printRef} data={os} />
      </div>
    </div>
  );
}
