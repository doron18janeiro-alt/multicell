"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Car,
  FileText,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import {
  primeSegmentSessionCache,
  resetSegmentSessionCache,
  type CompanySegment,
} from "@/hooks/useSegment";

type SetupWizardProps = {
  canEdit: boolean;
  companyName: string;
  companyDocument: string;
  companyPhone: string;
  companyAddress: string;
  responsibleName: string;
};

const segmentOptions: Array<{
  id: CompanySegment;
  title: string;
  description: string;
  icon: typeof Wrench;
}> = [
  {
    id: "TECH",
    title: "Assistência Técnica",
    description: "Ordens de serviço, garantia, aparelho e IMEI/Serial.",
    icon: Wrench,
  },
  {
    id: "RETAIL",
    title: "Loja / Varejo",
    description: "PDV rápido, código de barras, estoque e venda direta.",
    icon: ShoppingBag,
  },
  {
    id: "AUTO",
    title: "Auto Center",
    description: "Checklist, O.S. automotiva, placa/chassi e histórico.",
    icon: Car,
  },
  {
    id: "BEAUTY",
    title: "Beleza",
    description: "Agenda, procedimentos, carteira de clientes e recorrência.",
    icon: Sparkles,
  },
  {
    id: "FOOD",
    title: "Alimentação",
    description: "Pedidos rápidos, itens de balcão e operação objetiva.",
    icon: UtensilsCrossed,
  },
];

export function SetupWizard({
  canEdit,
  companyName,
  companyDocument,
  companyPhone,
  companyAddress,
  responsibleName,
}: SetupWizardProps) {
  const router = useRouter();
  const [selectedSegment, setSelectedSegment] = useState<CompanySegment | null>(
    null,
  );
  const [companyProfile, setCompanyProfile] = useState({
    name: companyName || "",
    cnpj: companyDocument || "",
    phone: companyPhone || "",
    address: companyAddress || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedOption = useMemo(
    () =>
      segmentOptions.find((option) => option.id === selectedSegment) || null,
    [selectedSegment],
  );

  const isSubmitDisabled =
    !canEdit || saving || !selectedSegment || !companyProfile.name.trim();

  const handleSave = async () => {
    if (isSubmitDisabled) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          segment: selectedSegment,
          name: companyProfile.name.trim(),
          cnpj: companyProfile.cnpj.trim(),
          phone: companyProfile.phone.trim(),
          address: companyProfile.address.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "Não foi possível salvar a configuração.");
        setSaving(false);
        return;
      }

      resetSegmentSessionCache();

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (sessionResponse.ok) {
        const sessionPayload = await sessionResponse.json();
        primeSegmentSessionCache(sessionPayload);
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      console.error(requestError);
      setError("Falha de conexão ao salvar o segmento.");
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      resetSegmentSessionCache();
      router.replace("/login");
      router.refresh();
    }
  };

  const handleProfileChange =
    (field: "name" | "cnpj" | "phone" | "address") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setCompanyProfile((current) => ({
        ...current,
        [field]: value,
      }));
    };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050c1a] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_28%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#FACC15]/30 bg-[#FACC15]/10 shadow-[0_0_30px_rgba(250,204,21,0.14)]">
            <Globe2 className="h-11 w-11 text-[#FACC15]" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.45em] text-[#FACC15]">
            World Tech Manager
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            World Tech Manager - Gestão Inteligente
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            Defina o DNA da operação e complete a identidade da empresa antes
            de entrar no dashboard.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b1121]/85 p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Responsável pela configuração</p>
              <h2 className="text-2xl font-semibold text-white">
                {responsibleName}
              </h2>
            </div>
            <div className="text-sm text-slate-400">
              A configuração salva o segmento e os dados da empresa no mesmo
              passo.
            </div>
          </div>

          {!canEdit ? (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
              Apenas um administrador pode definir o segmento inicial da
              empresa. Entre com a conta principal ou aguarde a configuração da
              loja.
            </div>
          ) : null}

          <div className="mt-8">
            <div className="mb-5">
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Escolha o segmento da empresa
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                O sistema muda labels, menus e fluxos com base nessa escolha.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {segmentOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedSegment === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!canEdit || saving}
                    onClick={() => setSelectedSegment(option.id)}
                    className={`group rounded-3xl border p-5 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-[#FACC15] bg-[#FACC15]/12 shadow-[0_0_30px_rgba(250,204,21,0.12)]"
                        : "border-white/10 bg-white/5 hover:border-[#FACC15]/40 hover:bg-white/8"
                    } ${!canEdit ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div
                      className={`inline-flex rounded-2xl p-3 ${
                        isSelected
                          ? "bg-[#FACC15] text-[#050c1a]"
                          : "bg-white/8 text-[#FACC15]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                      {option.id}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-white">
                      {option.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <div className="mb-5">
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Identidade da empresa
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Preencha os dados essenciais do World Tech Manager para liberar
                documentos e impressão.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-[#060b16]/80 p-4">
                <span className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Building2 className="h-4 w-4 text-[#FACC15]" />
                  Nome da Empresa
                </span>
                <input
                  type="text"
                  value={companyProfile.name}
                  onChange={handleProfileChange("name")}
                  placeholder="Ex: World Tech Manager Auto Center"
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1121] px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#FACC15]/60"
                  disabled={!canEdit || saving}
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-[#060b16]/80 p-4">
                <span className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <FileText className="h-4 w-4 text-[#FACC15]" />
                  CNPJ
                </span>
                <input
                  type="text"
                  value={companyProfile.cnpj}
                  onChange={handleProfileChange("cnpj")}
                  placeholder="CNPJ da World Tech Manager"
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1121] px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#FACC15]/60"
                  disabled={!canEdit || saving}
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-[#060b16]/80 p-4">
                <span className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Phone className="h-4 w-4 text-[#FACC15]" />
                  Telefone
                </span>
                <input
                  type="text"
                  value={companyProfile.phone}
                  onChange={handleProfileChange("phone")}
                  placeholder="Telefone principal da World Tech Manager"
                  className="w-full rounded-2xl border border-white/10 bg-[#0b1121] px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#FACC15]/60"
                  disabled={!canEdit || saving}
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-[#060b16]/80 p-4">
                <span className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <MapPin className="h-4 w-4 text-[#FACC15]" />
                  Endereço
                </span>
                <textarea
                  value={companyProfile.address}
                  onChange={handleProfileChange("address")}
                  rows={3}
                  placeholder="Endereco principal da World Tech Manager"
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#0b1121] px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#FACC15]/60"
                  disabled={!canEdit || saving}
                />
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#060b16]/80 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#FACC15]">
                Pronto para entrar
              </p>
              <p className="mt-1 text-lg text-white">
                {selectedOption?.title || "Escolha um segmento para continuar"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {selectedOption?.description ||
                  "Depois disso o menu lateral, os labels e os módulos passam a refletir o perfil da empresa."}
              </p>
              {error ? (
                <p className="mt-3 text-sm text-red-300">{error}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                Sair
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitDisabled}
                className="inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-[#FACC15] px-6 py-3 text-sm font-semibold text-[#050c1a] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando configuração...
                  </>
                ) : (
                  "Salvar e Entrar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
