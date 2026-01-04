"use client";

import React, { useState, useRef } from "react";
import {
  Save,
  Printer,
  Smartphone,
  User,
  FileText,
  CheckSquare,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";

export default function NewServiceOrder() {
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientDocument: "",
    deviceModel: "",
    deviceBrand: "",
    imei: "",
    passcode: "",
    clientReport: "",
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
    content: () => printRef.current,
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
        alert(`O.S. #${data.id} salva com sucesso!`);
        // Opcional: Redirecionar ou limpar formulário
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Componente Oculto para Impressão */}
      <div style={{ display: "none" }}>
        <ServiceOrderPrint ref={printRef} data={formData} />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                  Marca
                </label>
                <select
                  name="deviceBrand"
                  value={formData.deviceBrand}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Selecione...</option>
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                  <option value="Xiaomi">Xiaomi</option>
                  <option value="Motorola">Motorola</option>
                  <option value="Dell">Dell</option>
                  <option value="Outro">Outro</option>
                </select>
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
}                      fill="none"
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
                  <span className="text-sm text-slate-300">{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Status e Previsão */}
          <section className="card-dashboard">
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                Status Inicial
              </label>
              <div className="w-full p-3 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-center font-bold text-sm">
                AGUARDANDO ANÁLISE
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">
                Previsão de Entrega
              </label>
              <input type="date" className="input-field" />
            </div>

            <div className="pt-4 border-t border-[#233554] mt-4">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-400">Técnico Responsável</span>
                <span className="text-white font-medium">--</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
