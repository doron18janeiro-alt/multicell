"use client";

import React, { useState, useRef, Suspense } from "react";
import {
  Save,
  Printer,
  Smartphone,
  User,
  FileText,
  CheckSquare,
  ArrowLeft,
  MessageCircle,
  CheckCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { ServiceOrderThermalPrint } from "@/components/ServiceOrderThermalPrint";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";
import { WhatsAppNotificationButton } from "@/components/WhatsAppNotificationButton";

function OrderServiceForm() {
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [generatedProtocol, setGeneratedProtocol] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const thermalPrintRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    customerId: "",
    clientName: "",
    clientPhone: "",
    clientDocument: "",
    deviceModel: "",
    deviceBrand: "",
    imei: "",
    passcode: "",
    clientReport: "",
    totalPrice: "",
    checklist: {
      physical: {
        riscos: false,
        trincas: false,
        marcasQueda: false,
        faltaParafusos: false,
        marcasUmidade: false,
        observations: "", // New field
      },
      tests: {
        liga: "SIM", // Changed to string/select
        touch: "OK",
        cameras: "OK",
        wifi: "OK",
        som: "OK",
        carregamento: "OK",
        biometria: "NÃO TESTADO",
      },
    },
  });

  // Effect to populate form data from URL params (ID or Direct Data)
  React.useEffect(() => {
    const clienteId = searchParams.get("clienteId");

    // Legacy support (optional)
    const customerId = searchParams.get("customerId");
    const name = searchParams.get("name");
    const phone = searchParams.get("phone");
    const document = searchParams.get("document");

    if (clienteId) {
      fetch(`/api/customers/${clienteId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setFormData((prev) => ({
              ...prev,
              customerId: String(data.id),
              clientName: data.name || "",
              clientPhone: data.phone || "",
              clientDocument: data.document || "",
            }));
          }
        })
        .catch((err) => console.error("Erro ao buscar cliente:", err));
    } else if (customerId || name) {
      setFormData((prev) => ({
        ...prev,
        customerId: customerId || prev.customerId,
        clientName: name || prev.clientName,
        clientPhone: phone || prev.clientPhone,
        clientDocument: document || prev.clientDocument,
      }));
    }
  }, [searchParams]);

  const generateProtocol = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    // Pega os 4 últimos dígitos do telefone ou 0000 se não tiver telefone suficiente
    const phone = formData.clientPhone.replace(/\D/g, "");
    const suffix = phone.length >= 4 ? phone.slice(-4) : "0000";

    const protocol = `MC${yyyy}${mm}${dd}-${suffix}`;
    setGeneratedProtocol(protocol);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (
    category: "physical" | "tests",
    key: string,
    value?: any, // Allow explicit value
  ) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [category]: {
          ...prev.checklist[category],
          [key]:
            value !== undefined
              ? value
              : !prev.checklist[category][
                  key as keyof (typeof prev.checklist)[typeof category]
                ],
        },
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessData(data);
        // alert(`O.S. #${data.id} salva com sucesso!`);
      } else {
        alert("Erro ao salvar O.S.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsAppWelcome = () => {
    if (!successData) return;
    const phone = successData.clientPhone.replace(/\D/g, "");
    const message = `Olá, ${successData.clientName}! Bem-vindo(a) à MULTICELL - Assistência Técnica Especializada. 🛠️\n\nConfirmamos a abertura da sua Ordem de Serviço nº ${successData.id} para o equipamento ${successData.deviceBrand} ${successData.deviceModel}. Seu aparelho já está em nossa bancada para diagnóstico.\n\n🔒 Segurança e Transparência: Você receberá atualizações em tempo real sobre o status do reparo diretamente por este canal. Nosso compromisso é com a excelência técnica e a agilidade no seu atendimento.\n\n📍 Localização: Rua das Flores, 123 - Centro\n📞 Dúvidas: Basta responder a esta mensagem.\n\nObrigado por confiar seu patrimônio à nossa equipe! ✨`;

    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handlePrint = useReactToPrint({
    // @ts-ignore
    contentRef: thermalPrintRef,
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hidden Thermal Print Component */}
      <div style={{ display: "none" }}>
        {successData && (
          <ServiceOrderThermalPrint ref={thermalPrintRef} data={successData} />
        )}
      </div>

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#112240] p-8 rounded-2xl border border-slate-700 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setSuccessData(null);
                window.location.href = "/os/novo"; // Reset form or navigate
                // Alternatively just clear form data
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white">
                O.S. Criada com Sucesso!
              </h2>
              <p className="text-slate-400 font-mono text-lg mt-2">
                #{successData.id}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handlePrint()}
                className="w-full bg-[#1e293b] hover:bg-[#334155] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Printer size={20} />
                Imprimir Comprovante
              </button>

              <div className="w-full">
                <WhatsAppNotificationButton
                  clientName={successData.clientName}
                  clientPhone={successData.clientPhone}
                  deviceModel={successData.deviceModel}
                  deviceBrand={successData.deviceBrand}
                  problem={successData.problem}
                  osId={successData.id}
                  status="ABERTO"
                  checklist={{
                    liga: successData.checklist?.tests?.liga || "N/A",
                    tela: successData.checklist?.tests?.touch || "N/A",
                    corpo:
                      successData.checklist?.physical?.observations ||
                      (successData.checklist?.physical?.riscos
                        ? "COM RISCOS"
                        : "OK"),
                  }}
                />
              </div>

              <button
                onClick={() => (window.location.href = `/os/${successData.id}`)}
                className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A192F] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <CheckSquare size={20} />
                Ver Detalhes da O.S.
              </button>

              <button
                onClick={() => {
                  setSuccessData(null);
                  setFormData({
                    customerId: "",
                    clientName: "",
                    clientPhone: "",
                    clientDocument: "",
                    deviceModel: "",
                    deviceBrand: "",
                    imei: "",
                    passcode: "",
                    clientReport: "",
                    totalPrice: "",
                    checklist: {
                      physical: {
                        riscos: false,
                        trincas: false,
                        marcasQueda: false,
                        faltaParafusos: false,
                        marcasUmidade: false,
                        observations: "",
                      },
                      tests: {
                        liga: "SIM",
                        touch: "OK",
                        cameras: "OK",
                        wifi: "OK",
                        som: "OK",
                        carregamento: "OK",
                        biometria: "NÃO TESTADO",
                      },
                    },
                  });
                }}
                className="w-full text-slate-400 hover:text-white pt-2 text-sm"
              >
                Criar Nova O.S.
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Oculto para Impressão */}
      <div style={{ display: "none" }}>
        <ServiceOrderPrint
          ref={printRef}
          data={{
            ...formData,
            id: successData?.id || generatedProtocol,
            problem: formData.clientReport,
            clientCpf: formData.clientDocument,
            totalPrice: Number(formData.totalPrice) || 0,
          }}
        />
      </div>

      {/* Header da Página */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-full bg-[#112240] text-slate-400 hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Nova Ordem de Serviço
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 text-sm">
                Preencha os dados para entrada do aparelho
              </p>
              <div className="flex items-center gap-2 bg-[#112240] px-3 py-1 rounded-md border border-[#233554]">
                <span className="text-xs text-[#D4AF37] font-bold uppercase">
                  PROT:
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {successData?.id
                    ? `#${successData.id}`
                    : generatedProtocol || "---"}
                </span>
                {!successData?.id && (
                  <button
                    onClick={generateProtocol}
                    type="button"
                    className="ml-2 text-[10px] bg-[#D4AF37] text-black px-2 py-0.5 rounded font-bold uppercase hover:bg-yellow-500 transition-colors"
                  >
                    Gerar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Botão de WhatsApp */}
          <WhatsAppNotificationButton
            clientName={formData.clientName}
            clientPhone={formData.clientPhone}
            deviceBrand={formData.deviceBrand}
            deviceModel={formData.deviceModel}
            problem={formData.clientReport}
            osId={successData?.id || generatedProtocol}
            status="PENDENTE" // Nova OS é sempre pendente
            disabled={!formData.clientName || !formData.clientPhone}
          />

          <button onClick={handlePrint} className="btn-outline">
            <Printer size={18} /> Imprimir Termo
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
          >
            <Save size={18} /> {isSaving ? "Salvando..." : "Salvar O.S."}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Formulários Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Cliente */}
          <section className="card-dashboard">
            <div className="flex items-center gap-2 mb-6 border-b border-[#233554] pb-4">
              <User className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">
                Dados do Cliente
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Nome Completo
                </label>
                <input
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  type="text"
                  className="input-field"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  WhatsApp / Contato
                </label>
                <input
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleInputChange}
                  type="text"
                  className="input-field"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  CPF / CNPJ
                </label>
                <input
                  name="clientDocument"
                  value={formData.clientDocument}
                  onChange={handleInputChange}
                  type="text"
                  className="input-field w-full md:w-1/2"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </section>

          {/* Dados do Aparelho */}
          <section className="card-dashboard">
            <div className="flex items-center gap-2 mb-6 border-b border-[#233554] pb-4">
              <Smartphone className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">
                Dados do Aparelho
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-yellow-500 uppercase">
                  Marca do Aparelho
                </label>
                <input
                  list="marcas-list"
                  name="deviceBrand"
                  value={formData.deviceBrand}
                  onChange={handleInputChange}
                  placeholder="Digite ou selecione (ex: Dell, Samsung)"
                  className="w-full bg-[#0a1529] border border-gray-700 rounded-md p-3 text-white placeholder-gray-500 focus:border-yellow-500 outline-none transition-all"
                  required
                />
                <datalist id="marcas-list">
                  <option value="Samsung" />
                  <option value="Apple" />
                  <option value="Motorola" />
                  <option value="Xiaomi" />
                  <option value="Dell" />
                  <option value="HP" />
                  <option value="Lenovo" />
                  <option value="Acer" />
                  <option value="Asus" />
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-yellow-500 uppercase">
                  Valor do Serviço (R$)
                </label>
                <input
                  type="number"
                  name="totalPrice"
                  step="0.01"
                  value={formData.totalPrice}
                  onChange={handleInputChange}
                  placeholder="0,00"
                  className="w-full bg-[#0a1529] border border-gray-700 rounded-md p-3 text-white placeholder-gray-500 focus:border-yellow-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Modelo
                </label>
                <input
                  name="deviceModel"
                  value={formData.deviceModel}
                  onChange={handleInputChange}
                  type="text"
                  className="input-field"
                  placeholder="Ex: iPhone 13 Pro Max"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  IMEI / Serial
                </label>
                <input
                  name="imei"
                  value={formData.imei}
                  onChange={handleInputChange}
                  type="text"
                  className="input-field"
                  placeholder="S/N ou IMEI"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Senha de Bloqueio
                </label>
                <input
                  name="passcode"
                  value={formData.passcode}
                  onChange={handleInputChange}
                  type="text"
                  className="input-field"
                  placeholder="Padrão ou PIN"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Cor
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Azul Sierra"
                />
              </div>
            </div>
          </section>

          {/* Relato do Problema */}
          <section className="card-dashboard">
            <div className="flex items-center gap-2 mb-6 border-b border-[#233554] pb-4">
              <FileText className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">
                Relato do Cliente & Laudo Inicial
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Defeito Relatado
                </label>
                <textarea
                  name="clientReport"
                  value={formData.clientReport}
                  onChange={handleInputChange}
                  className="input-field h-24 resize-none"
                  placeholder="Descreva o problema relatado pelo cliente..."
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Observações Técnicas (Pré-análise)
                </label>
                <textarea
                  className="input-field h-24 resize-none"
                  placeholder="Observações do técnico na recepção..."
                ></textarea>
              </div>
            </div>
          </section>
        </div>

        {/* Coluna Direita: Checklist e Resumo */}
        <div className="space-y-6">
          {/* Checklist de Entrada */}
          <section className="card-dashboard border-l-4 border-l-[#D4AF37]">
            <div className="flex items-center gap-2 mb-6">
              <CheckSquare className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">
                Checklist de Entrada
              </h2>
            </div>

            <div className="space-y-6">
              {/* Estado Físico */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Estado Físico
                </h3>
                <div className="space-y-2">
                  {[
                    { id: "riscos", label: "Riscos / Arranhões" },
                    { id: "trincas", label: "Trincas na Tela/Carcaça" },
                    { id: "marcasQueda", label: "Marcas de Queda" },
                    { id: "faltaParafusos", label: "Falta Parafusos" },
                    { id: "marcasUmidade", label: "Marcas de Umidade" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-[#112240] cursor-pointer transition-colors"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            formData.checklist.physical[
                              item.id as keyof typeof formData.checklist.physical
                            ] as boolean
                          }
                          onChange={() =>
                            handleChecklistChange("physical", item.id)
                          }
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-500 checked:border-[#D4AF37] checked:bg-[#D4AF37] transition-all"
                        />
                        <svg
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-[#0A192F]"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M3 8L6 11L11 3.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-300">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Testes Iniciais - REDESIGNED */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Checklist Rápido
                </h3>
                <div className="space-y-4">
                  {/* Aparelho Liga */}
                  <div>
                    <span className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">
                      Aparelho Liga?
                    </span>
                    <div className="flex gap-2">
                      {["SIM", "NÃO", "SEM CARGA"].map((opt) => (
                        <div
                          key={opt}
                          onClick={() =>
                            handleChecklistChange("tests", "liga", opt)
                          }
                          className={`flex-1 p-2 text-center text-xs font-bold rounded cursor-pointer border ${
                            formData.checklist.tests.liga === opt
                              ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                              : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Touch Screen */}
                  <div>
                    <span className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">
                      Tela / Touch
                    </span>
                    <div className="flex gap-2">
                      {["OK", "FALHANDO", "QUEBRADO"].map((opt) => (
                        <div
                          key={opt}
                          onClick={() =>
                            handleChecklistChange("tests", "touch", opt)
                          }
                          className={`flex-1 p-2 text-center text-xs font-bold rounded cursor-pointer border ${
                            formData.checklist.tests.touch === opt
                              ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                              : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Estado Físico (Simplificado) */}
                  <div>
                    <span className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">
                      Estado da Carcaça
                    </span>
                    <div className="flex gap-2">
                      {["OK", "RISCOS LEVES", "AMASSADO"].map((opt) => (
                        <div
                          key={opt}
                          onClick={() =>
                            handleChecklistChange(
                              "physical",
                              "riscos",
                              opt === "RISCOS LEVES" || opt === "AMASSADO",
                            )
                          }
                          className={`flex-1 p-2 text-center text-xs font-bold rounded cursor-pointer border ${
                            (opt === "OK" &&
                              !formData.checklist.physical.riscos) ||
                            (opt !== "OK" && formData.checklist.physical.riscos)
                              ? "bg-slate-700 text-white border-slate-600" // Just toggles for now, can be improved
                              : "bg-transparent text-slate-400 border-slate-700"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                    <textarea
                      className="w-full bg-[#0B1120] border border-gray-700 rounded-md p-2 text-xs text-white placeholder-gray-500 mt-2 h-20 resize-none"
                      placeholder="Detalhes visuais (ex: tampa traseira trincada, botão power amassado...)"
                      value={formData.checklist.physical.observations}
                      onChange={(e) =>
                        handleChecklistChange(
                          "physical",
                          "observations",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-[#112240] transition-colors font-bold"
            >
              <ArrowLeft size={20} />
              Cancelar
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-[#D4AF37] text-[#0A192F] hover:bg-[#C5A028] transition-colors font-bold disabled:opacity-50"
            >
              {isSaving ? (
                "Salvando..."
              ) : (
                <>
                  <Save size={20} />
                  Salvar O.S.
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <ServiceOrderPrint
          ref={printRef}
          data={{
            ...formData,
            id: successData?.id || generatedProtocol,
            problem: formData.clientReport,
            clientCpf: formData.clientDocument,
            totalPrice: Number(formData.totalPrice) || 0,
          }}
        />
      </div>
    </div>
  );
}

export default function NewServiceOrder() {
  return (
    <Suspense
      fallback={<div className="p-10 text-white">Carregando formulário...</div>}
    >
      <OrderServiceForm />
    </Suspense>
  );
}
