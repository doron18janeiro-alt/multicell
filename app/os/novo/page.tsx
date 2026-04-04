"use client";

import React, { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeft,
  CarFront,
  CheckCircle,
  CheckSquare,
  FileText,
  Fuel,
  Gauge,
  Printer,
  Save,
  Search,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { ServiceOrderThermalPrint } from "@/components/ServiceOrderThermalPrint";
import { ServiceOrderPrint } from "@/components/ServiceOrderPrint";
import { WhatsAppNotificationButton } from "@/components/WhatsAppNotificationButton";
import { useSegment } from "@/hooks/useSegment";
import {
  formatVehiclePlate,
  getVehicleFuelLabel,
  getVehicleSteeringLabel,
  normalizeVehiclePlate,
} from "@/lib/segment-specialization";

type CarcacaStatus = "OK" | "RISCOS LEVES" | "AMASSADO";

type VehicleLookupResult = {
  id: string;
  name: string;
  salePrice: number;
  costPrice: number;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehiclePlate?: string | null;
  vehicleChassis?: string | null;
  vehicleRenavam?: string | null;
  vehicleManufactureYear?: number | null;
  vehicleModelYear?: number | null;
  vehicleEngine?: string | null;
  vehicleFuel?: string | null;
  vehicleAirConditioning?: boolean | null;
  vehicleAirbag?: boolean | null;
  vehicleSteering?: string | null;
  vehiclePowerWindows?: boolean | null;
  vehicleAlarm?: boolean | null;
  vehicleMultimedia?: boolean | null;
  vehicleAdditionalInfo?: string | null;
};

const AUTO_FUEL_LEVELS = ["RESERVA", "1/4", "1/2", "3/4", "CHEIO"];

const createInitialFormData = () => ({
  customerId: "",
  clientName: "",
  clientPhone: "",
  clientDocument: "",
  deviceBrand: "",
  deviceModel: "",
  imei: "",
  passcode: "",
  color: "",
  clientReport: "",
  technicalObservations: "",
  totalPrice: "",
  checklist: {
    physical: {
      riscos: false,
      trincas: false,
      marcasQueda: false,
      faltaParafusos: false,
      marcasUmidade: false,
      carcacaStatus: "OK" as CarcacaStatus,
      observations: "",
    },
    tests: {
      liga: "SIM",
      touch: "OK",
    },
    auto: {
      fuelLevel: "1/2",
      mileage: "",
      plate: "",
      color: "",
      externalDamage: "",
      vehicleId: "",
      vehicleSnapshot: null as Record<string, unknown> | null,
    },
  },
});

function OrderServiceForm() {
  const searchParams = useSearchParams();
  const { getLabel, segment } = useSegment();
  const isAutoSegment = segment === "AUTO";
  const [formData, setFormData] = useState(createInitialFormData);
  const [successData, setSuccessData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedProtocol, setGeneratedProtocol] = useState("");
  const [plateLookup, setPlateLookup] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [linkedVehicle, setLinkedVehicle] = useState<VehicleLookupResult | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const thermalPrintRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const clienteId = searchParams.get("clienteId");
    const customerId = searchParams.get("customerId");
    const name = searchParams.get("name");
    const phone = searchParams.get("phone");
    const document = searchParams.get("document");

    if (clienteId) {
      fetch(`/api/customers/${clienteId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data) return;
          setFormData((prev) => ({
            ...prev,
            customerId: String(data.id),
            clientName: data.name || "",
            clientPhone: data.phone || "",
            clientDocument: data.document || "",
          }));
        })
        .catch((err) => console.error("Erro ao buscar cliente:", err));
      return;
    }

    if (customerId || name) {
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
    const phone = formData.clientPhone.replace(/\D/g, "");
    const suffix = phone.length >= 4 ? phone.slice(-4) : "0000";
    setGeneratedProtocol(
      `MC${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${suffix}`,
    );
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (category: "physical" | "tests", key: string, value?: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [category]: {
          ...prev.checklist[category],
          [key]:
            value !== undefined
              ? value
              : !prev.checklist[category][key as keyof (typeof prev.checklist)[typeof category]],
        },
      },
    }));
  };

  const handleAutoFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        auto: {
          ...prev.checklist.auto,
          [key]: value,
        },
      },
    }));
  };

  const searchVehicleByPlate = async () => {
    const normalizedPlate = normalizeVehiclePlate(plateLookup);
    if (!normalizedPlate) {
      alert("Informe uma placa válida para buscar.");
      return;
    }

    setLookupState("loading");

    try {
      const response = await fetch(`/api/products?plate=${normalizedPlate}`);
      const payload = await response.json();
      const vehicle = Array.isArray(payload) ? payload[0] : null;

      if (!vehicle) {
        setLinkedVehicle(null);
        setLookupState("not_found");
        handleAutoFieldChange("plate", normalizedPlate);
        setFormData((prev) => ({ ...prev, imei: normalizedPlate }));
        return;
      }

      const vehicleSnapshot = {
        id: vehicle.id,
        brand: vehicle.vehicleBrand,
        model: vehicle.vehicleModel,
        plate: vehicle.vehiclePlate,
        chassis: vehicle.vehicleChassis,
        renavam: vehicle.vehicleRenavam,
        engine: vehicle.vehicleEngine,
        fuel: vehicle.vehicleFuel,
        steering: vehicle.vehicleSteering,
        manufactureYear: vehicle.vehicleManufactureYear,
        modelYear: vehicle.vehicleModelYear,
        airConditioning: Boolean(vehicle.vehicleAirConditioning),
        airbag: Boolean(vehicle.vehicleAirbag),
        powerWindows: Boolean(vehicle.vehiclePowerWindows),
        alarm: Boolean(vehicle.vehicleAlarm),
        multimedia: Boolean(vehicle.vehicleMultimedia),
        additionalInfo: vehicle.vehicleAdditionalInfo || "",
        costPrice: vehicle.costPrice || 0,
        salePrice: vehicle.salePrice || 0,
      };

      setLinkedVehicle(vehicle);
      setLookupState("found");
      setFormData((prev) => ({
        ...prev,
        deviceBrand: vehicle.vehicleBrand || prev.deviceBrand,
        deviceModel: vehicle.vehicleModel || prev.deviceModel,
        imei: vehicle.vehiclePlate || normalizedPlate,
        checklist: {
          ...prev.checklist,
          auto: {
            ...prev.checklist.auto,
            plate: vehicle.vehiclePlate || normalizedPlate,
            vehicleId: vehicle.id,
            vehicleSnapshot,
          },
        },
      }));
    } catch (error) {
      console.error("Erro ao buscar veículo:", error);
      setLookupState("not_found");
      setLinkedVehicle(null);
    }
  };

  const handleSave = async () => {
    const requiredIdentifier = isAutoSegment ? formData.checklist.auto.plate : formData.imei;

    if (!formData.clientName || !formData.clientPhone || !formData.deviceBrand || !formData.deviceModel || !requiredIdentifier) {
      alert("Preencha os dados principais antes de salvar a O.S.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        imei: isAutoSegment ? normalizeVehiclePlate(formData.checklist.auto.plate) : formData.imei,
        checklist: {
          ...formData.checklist,
          auto: isAutoSegment
            ? {
                ...formData.checklist.auto,
                plate: normalizeVehiclePlate(formData.checklist.auto.plate),
                color: formData.checklist.auto.color || formData.color,
              }
            : formData.checklist.auto,
        },
      };

      const response = await fetch("/api/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Erro ao salvar O.S.");
        return;
      }

      const data = await response.json();
      setSuccessData(data);
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = useReactToPrint({ contentRef: thermalPrintRef as any });

  const checklistSummary = isAutoSegment
    ? {
        assetType: "vehicle" as const,
        plate: formatVehiclePlate(formData.checklist.auto.plate),
        fuelLevel: formData.checklist.auto.fuelLevel,
        mileage: formData.checklist.auto.mileage,
        color: formData.checklist.auto.color || formData.color,
        externalDamage: formData.checklist.auto.externalDamage,
      }
    : {
        liga: formData.checklist.tests.liga,
        tela: formData.checklist.tests.touch,
        carcaca: formData.checklist.physical.carcacaStatus,
      };

  const linkedAccessories = [
    linkedVehicle?.vehicleAirConditioning && "Ar Condicionado",
    linkedVehicle?.vehicleAirbag && "Airbag",
    linkedVehicle?.vehiclePowerWindows && "Vidro Elétrico",
    linkedVehicle?.vehicleAlarm && "Alarme",
    linkedVehicle?.vehicleMultimedia && "Som / Multimídia",
  ].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto">
      <div style={{ display: "none" }}>
        {successData && <ServiceOrderThermalPrint ref={thermalPrintRef} data={successData} />}
      </div>
      <div style={{ display: "none" }}>
        <ServiceOrderPrint
          ref={printRef}
          data={{
            ...formData,
            id: successData?.id || generatedProtocol,
            problem: formData.clientReport,
            observations: formData.technicalObservations,
            clientCpf: formData.clientDocument,
            serialNumber: isAutoSegment ? formData.checklist.auto.plate : formData.imei,
            deviceColor: isAutoSegment ? formData.checklist.auto.color || formData.color : formData.color,
            totalPrice: Number(formData.totalPrice) || 0,
          }}
        />
      </div>

      {successData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#112240] p-8 rounded-2xl border border-slate-700 w-full max-w-md relative">
            <button onClick={() => (window.location.href = "/os/novo")} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={24} />
            </button>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white">O.S. Criada com Sucesso!</h2>
              <p className="text-slate-400 font-mono text-lg mt-2">#{successData.id}</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => handlePrint()} className="w-full bg-[#1e293b] hover:bg-[#334155] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors">
                <Printer size={20} />
                Imprimir Comprovante
              </button>
              <WhatsAppNotificationButton
                clientName={successData.clientName}
                clientPhone={successData.clientPhone}
                deviceModel={successData.deviceModel}
                deviceBrand={successData.deviceBrand}
                problem={successData.problem}
                osId={successData.id}
                status="ABERTO"
                checklist={
                  isAutoSegment
                    ? {
                        assetType: "vehicle" as const,
                        plate: formatVehiclePlate(successData?.checklist?.auto?.plate),
                        fuelLevel: successData?.checklist?.auto?.fuelLevel,
                        mileage: successData?.checklist?.auto?.mileage,
                        color: successData?.checklist?.auto?.color || successData?.deviceColor,
                        externalDamage: successData?.checklist?.auto?.externalDamage,
                      }
                    : {
                        liga: successData?.checklist?.tests?.liga || "N/A",
                        tela: successData?.checklist?.tests?.touch || "N/A",
                        carcaca: successData?.checklist?.physical?.carcacaStatus || "OK",
                      }
                }
              />
              <button onClick={() => (window.location.href = `/os/${successData.id}`)} className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A192F] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                <CheckSquare size={20} />
                Ver Detalhes da O.S.
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full bg-[#112240] text-slate-400 hover:text-[#D4AF37] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isAutoSegment ? "Nova O.S. Automotiva" : "Nova Ordem de Serviço"}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-slate-400 text-sm">
                {isAutoSegment
                  ? "Recepção do veículo com busca por placa e checklist técnico."
                  : "Preencha os dados para entrada do aparelho."}
              </p>
              <div className="flex items-center gap-2 bg-[#112240] px-3 py-1 rounded-md border border-[#233554]">
                <span className="text-xs text-[#D4AF37] font-bold uppercase">PROT:</span>
                <span className="text-sm font-mono font-bold text-white">
                  {successData?.id ? `#${successData.id}` : generatedProtocol || "---"}
                </span>
                {!successData?.id && (
                  <button onClick={generateProtocol} type="button" className="ml-2 text-[10px] bg-[#D4AF37] text-black px-2 py-0.5 rounded font-bold uppercase hover:bg-yellow-500 transition-colors">
                    Gerar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <WhatsAppNotificationButton
            clientName={formData.clientName}
            clientPhone={formData.clientPhone}
            deviceBrand={formData.deviceBrand}
            deviceModel={formData.deviceModel}
            problem={formData.clientReport}
            osId={successData?.id || generatedProtocol}
            status="PENDENTE"
            checklist={checklistSummary}
            disabled={!formData.clientName || !formData.clientPhone}
          />
          <button onClick={handlePrint} className="btn-outline">
            <Printer size={18} /> Imprimir Termo
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary">
            <Save size={18} /> {isSaving ? "Salvando..." : "Salvar O.S."}
          </button>
        </div>
      </div>

      {isAutoSegment && (
        <section className="card-dashboard mb-6">
          <div className="flex items-center gap-2 mb-4 border-b border-[#233554] pb-4">
            <Search className="text-[#D4AF37]" size={20} />
            <h2 className="text-lg font-semibold text-white">Busca por Placa</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
            <input
              type="text"
              value={plateLookup}
              onChange={(e) => setPlateLookup(normalizeVehiclePlate(e.target.value))}
              className="input-field uppercase"
              placeholder="Digite a placa para consultar a ficha do veículo"
            />
            <button type="button" onClick={searchVehicleByPlate} className="rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#0A192F] hover:bg-[#C5A028] transition-colors">
              {lookupState === "loading" ? "Buscando..." : "Buscar Placa"}
            </button>
          </div>
          {lookupState === "found" && <p className="mt-3 text-sm text-emerald-400">Veículo localizado e dados aplicados na O.S.</p>}
          {lookupState === "not_found" && <p className="mt-3 text-sm text-amber-300">Nenhum veículo encontrado. Você pode continuar com preenchimento manual.</p>}
          {linkedVehicle && <div className="mt-4 rounded-2xl border border-amber-400/20 bg-[#0B1120] p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3 flex-wrap"><h3 className="text-xl font-bold text-white">{linkedVehicle.vehicleBrand} {linkedVehicle.vehicleModel}</h3><span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">{formatVehiclePlate(linkedVehicle.vehiclePlate)}</span></div><p className="mt-2 text-sm text-slate-400">{linkedVehicle.vehicleEngine || "Motorização não informada"} • {getVehicleFuelLabel(linkedVehicle.vehicleFuel)} • {linkedVehicle.vehicleManufactureYear || "-"} / {linkedVehicle.vehicleModelYear || "-"}</p></div><div className="grid grid-cols-2 gap-3 text-sm min-w-[220px]"><div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3"><p className="text-slate-400 text-xs uppercase">Compra</p><p className="font-bold text-white">R$ {(linkedVehicle.costPrice || 0).toFixed(2)}</p></div><div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3"><p className="text-slate-400 text-xs uppercase">Venda</p><p className="font-bold text-amber-300">R$ {(linkedVehicle.salePrice || 0).toFixed(2)}</p></div></div></div><div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"><div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3"><p className="text-slate-400 text-xs uppercase">Chassi</p><p className="font-semibold text-white">{linkedVehicle.vehicleChassis || "Não informado"}</p></div><div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3"><p className="text-slate-400 text-xs uppercase">Renavam</p><p className="font-semibold text-white">{linkedVehicle.vehicleRenavam || "Não informado"}</p></div><div className="rounded-xl border border-slate-700 bg-[#112240] px-4 py-3"><p className="text-slate-400 text-xs uppercase">Direção</p><p className="font-semibold text-white">{getVehicleSteeringLabel(linkedVehicle.vehicleSteering)}</p></div></div>{linkedAccessories.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{linkedAccessories.map((item) => <span key={item} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">{item}</span>)}</div>}{linkedVehicle.vehicleAdditionalInfo && <p className="mt-4 text-sm leading-6 text-slate-300">{linkedVehicle.vehicleAdditionalInfo}</p>}</div>}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card-dashboard">
            <div className="flex items-center gap-2 mb-6 border-b border-[#233554] pb-4">
              <User className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">Dados do Cliente</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Nome Completo", name: "clientName", placeholder: "Ex: João da Silva" },
                { label: "WhatsApp / Contato", name: "clientPhone", placeholder: "(00) 00000-0000" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">{field.label}</label>
                  <input name={field.name} value={formData[field.name as "clientName" | "clientPhone"]} onChange={handleInputChange} type="text" className="input-field" placeholder={field.placeholder} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">CPF / CNPJ</label>
                <input name="clientDocument" value={formData.clientDocument} onChange={handleInputChange} type="text" className="input-field w-full md:w-1/2" placeholder="000.000.000-00" />
              </div>
            </div>
          </section>

          <section className="card-dashboard">
            <div className="flex items-center gap-2 mb-6 border-b border-[#233554] pb-4">
              {isAutoSegment ? <CarFront className="text-[#D4AF37]" size={20} /> : <Smartphone className="text-[#D4AF37]" size={20} />}
              <h2 className="text-lg font-semibold text-white">{isAutoSegment ? "Dados do Veículo" : "Dados do Aparelho"}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">{isAutoSegment ? "Marca" : "Marca do Aparelho"}</label>
                <input name="deviceBrand" value={formData.deviceBrand} onChange={handleInputChange} type="text" className="input-field" placeholder={isAutoSegment ? "Ex: Volkswagen, Fiat, Toyota" : "Ex: Samsung, Dell"} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Valor do Serviço (R$)</label>
                <input name="totalPrice" value={formData.totalPrice} onChange={handleInputChange} type="number" step="0.01" className="input-field" placeholder="0,00" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Modelo</label>
                <input name="deviceModel" value={formData.deviceModel} onChange={handleInputChange} type="text" className="input-field" placeholder={isAutoSegment ? "Ex: Gol 1.6 Trendline" : "Ex: iPhone 13 Pro Max"} />
              </div>
              {isAutoSegment ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Placa Vinculada</label>
                    <input value={formatVehiclePlate(formData.checklist.auto.plate)} onChange={(e) => { const plate = normalizeVehiclePlate(e.target.value); setFormData((prev) => ({ ...prev, imei: plate, checklist: { ...prev.checklist, auto: { ...prev.checklist.auto, plate } } })); }} type="text" className="input-field uppercase" placeholder="ABC1D23" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Cor</label>
                    <input value={formData.checklist.auto.color || formData.color} onChange={(e) => { const value = e.target.value; setFormData((prev) => ({ ...prev, color: value, checklist: { ...prev.checklist, auto: { ...prev.checklist.auto, color: value } } })); }} type="text" className="input-field" placeholder="Ex: Branco Pérola" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">{getLabel("identifier")}</label>
                    <input name="imei" value={formData.imei} onChange={handleInputChange} type="text" className="input-field" placeholder={getLabel("identifier")} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Senha de Bloqueio</label>
                    <input name="passcode" value={formData.passcode} onChange={handleInputChange} type="text" className="input-field" placeholder="Padrão ou PIN" />
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="card-dashboard">
            <div className="flex items-center gap-2 mb-6 border-b border-[#233554] pb-4">
              <FileText className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">{isAutoSegment ? "Queixa do Cliente & Recepção" : "Relato do Cliente & Laudo Inicial"}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">{isAutoSegment ? "Serviço solicitado" : "Defeito Relatado"}</label>
                <textarea name="clientReport" value={formData.clientReport} onChange={handleInputChange} className="input-field h-24 resize-none" placeholder={isAutoSegment ? "Descreva a queixa, ruídos, vazamentos ou reparos desejados..." : "Descreva o problema relatado pelo cliente..."} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Observações Técnicas (Pré-análise)</label>
                <textarea name="technicalObservations" value={formData.technicalObservations} onChange={handleInputChange} className="input-field h-24 resize-none" placeholder={isAutoSegment ? "Ex: vibração em alta, veículo chegou sem luz de injeção..." : "Observações do técnico na recepção..."} />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card-dashboard border-l-4 border-l-[#D4AF37]">
            <div className="flex items-center gap-2 mb-6">
              <CheckSquare className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-semibold text-white">{isAutoSegment ? "Checklist de Entrada do Veículo" : "Checklist de Entrada"}</h2>
            </div>
            {isAutoSegment ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2"><Fuel className="h-4 w-4 text-[#D4AF37]" /><span className="text-xs font-bold text-[#D4AF37] uppercase">Nível de Combustível</span></div>
                  <div className="grid grid-cols-5 gap-2">
                    {AUTO_FUEL_LEVELS.map((option) => (
                      <button key={option} type="button" onClick={() => handleAutoFieldChange("fuelLevel", option)} className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${formData.checklist.auto.fuelLevel === option ? "border-amber-400 bg-amber-400 text-black" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>{option}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2"><Gauge className="h-4 w-4 text-[#D4AF37]" /><label className="text-xs font-bold text-[#D4AF37] uppercase">KM Atual</label></div>
                  <input type="number" value={formData.checklist.auto.mileage} onChange={(e) => handleAutoFieldChange("mileage", e.target.value)} className="input-field" placeholder="Ex: 84523" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Placa</label><input type="text" value={formData.checklist.auto.plate} onChange={(e) => { const plate = normalizeVehiclePlate(e.target.value); setFormData((prev) => ({ ...prev, imei: plate, checklist: { ...prev.checklist, auto: { ...prev.checklist.auto, plate } } })); }} className="input-field uppercase" placeholder="ABC1D23" /></div>
                  <div><label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Cor</label><input type="text" value={formData.checklist.auto.color || formData.color} onChange={(e) => { const value = e.target.value; setFormData((prev) => ({ ...prev, color: value, checklist: { ...prev.checklist, auto: { ...prev.checklist.auto, color: value } } })); }} className="input-field" placeholder="Ex: Preto Ninja" /></div>
                </div>
                <div><label className="block text-xs font-bold text-[#D4AF37] uppercase mb-2">Avarias Externas (Riscos / Amassados)</label><textarea value={formData.checklist.auto.externalDamage} onChange={(e) => handleAutoFieldChange("externalDamage", e.target.value)} className="input-field h-28 resize-none" placeholder="Descreva riscos, amassados, rodas, lataria e acabamentos." /></div>
                {linkedAccessories.length > 0 && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-semibold text-white mb-3">Acessórios confirmados</p><div className="flex flex-wrap gap-2">{linkedAccessories.map((item) => <span key={item} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">{item}</span>)}</div></div>}
              </div>
            ) : (
              <div className="space-y-4">
                <div><span className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">Aparelho Liga?</span><div className="flex gap-2">{["SIM", "NÃO", "SEM CARGA"].map((option) => <button key={option} type="button" onClick={() => handleChecklistChange("tests", "liga", option)} className={`flex-1 p-2 text-center text-xs font-bold rounded border ${formData.checklist.tests.liga === option ? "bg-amber-400 text-black border-amber-400" : "text-slate-400 border-slate-700 hover:border-slate-500"}`}>{option}</button>)}</div></div>
                <div><span className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">Tela / Touch</span><div className="flex gap-2">{["OK", "FALHANDO", "QUEBRADO"].map((option) => <button key={option} type="button" onClick={() => handleChecklistChange("tests", "touch", option)} className={`flex-1 p-2 text-center text-xs font-bold rounded border ${formData.checklist.tests.touch === option ? "bg-amber-400 text-black border-amber-400" : "text-slate-400 border-slate-700 hover:border-slate-500"}`}>{option}</button>)}</div></div>
                <div><span className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">Estado da Carcaça</span><div className="flex gap-2">{(["OK", "RISCOS LEVES", "AMASSADO"] as CarcacaStatus[]).map((option) => <button key={option} type="button" onClick={() => handleChecklistChange("physical", "carcacaStatus", option)} className={`flex-1 p-2 text-center text-xs font-bold rounded border ${formData.checklist.physical.carcacaStatus === option ? "bg-amber-400 text-black border-amber-400" : "text-slate-400 border-slate-700 hover:border-slate-500"}`}>{option}</button>)}</div><textarea value={formData.checklist.physical.observations} onChange={(e) => handleChecklistChange("physical", "observations", e.target.value)} className="w-full bg-[#0B1120] border border-gray-700 rounded-md p-2 text-xs text-white placeholder-gray-500 mt-2 h-20 resize-none" placeholder="Detalhes visuais do aparelho..." /></div>
              </div>
            )}
          </section>

          <div className="flex gap-4">
            <Link href="/" className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border border-slate-700 text-slate-300 hover:bg-[#112240] transition-colors font-bold">
              <ArrowLeft size={20} />
              Cancelar
            </Link>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-[#D4AF37] text-[#0A192F] hover:bg-[#C5A028] transition-colors font-bold disabled:opacity-50">
              {isSaving ? "Salvando..." : <><Save size={20} />Salvar O.S.</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewServiceOrder() {
  return (
    <Suspense fallback={<div className="p-10 text-white">Carregando formulário...</div>}>
      <OrderServiceForm />
    </Suspense>
  );
}
