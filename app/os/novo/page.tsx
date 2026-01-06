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
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";

function OrderServiceForm() {
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    clientName: searchParams.get("name") || "",
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
      },
      tests: {
        liga: false,
        touch: false,
        cameras: false,
        wifi: false,
        som: false,
        carregamento: false,
      },
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (
    category: "physical" | "tests",
    key: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [category]: {
          ...prev.checklist[category],
          [key]:
            !prev.checklist[category][
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

  return (
    <div className="max-w-7xl mx-auto">
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
                onClick={handlePrint}
                className="w-full bg-[#1e293b] hover:bg-[#334155] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Printer size={20} />
                Imprimir Comprovante
              </button>

              <button
                onClick={handleWhatsAppWelcome}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
              >
                <MessageCircle size={20} />
                Enviar Mensagem de Boas-Vindas
              </button>

              <button
                onClick={() => {
                  setSuccessData(null);
                  setFormData({
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
                      },
                      tests: {
                        liga: false,
                        touch: false,
                        cameras: false,
                        wifi: false,
                        som: false,
                        carregamento: false,
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
            <p className="text-slate-400 text-sm">
              Preencha os dados para entrada do aparelho
            </p>
          </div>
        </div>
        <div className="flex gap-3">
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
                            ]
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

              {/* Testes Iniciais */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Testes Iniciais
                </h3>
                <div className="space-y-2">
                  {[
                    { id: "liga", label: "Aparelho Liga" },
                    { id: "touch", label: "Touch Screen Funciona" },
                    { id: "cameras", label: "Câmeras OK" },
                    { id: "wifi", label: "Wi-Fi / Rede" },
                    { id: "som", label: "Áudio / Microfone" },
                    { id: "carregamento", label: "Carregamento" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-[#112240] cursor-pointer transition-colors"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            formData.checklist.tests[
                              item.id as keyof typeof formData.checklist.tests
                            ]
                          }
                          onChange={() =>
                            handleChecklistChange("tests", item.id)
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
        <ServiceOrderPrint ref={printRef} data={formData} />
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
