"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Car,
  CircleDollarSign,
  FileText,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
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
import LogoHolografica from "./LogoHolografica";

type SetupWizardProps = {
  mode?: "public" | "private";
  canEdit?: boolean;
  companyName?: string;
  companyDocument?: string;
  companyPhone?: string;
  companyAddress?: string;
  responsibleName?: string;
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

const publicBenefits: Array<{
  title: string;
  description: string;
  icon: typeof Wrench;
  accent: string;
}> = [
  {
    title: "Implantação guiada",
    description:
      "O cadastro já nasce com segmento, linguagem e atalhos alinhados ao perfil da empresa.",
    icon: BadgeCheck,
    accent: "border-[#FACC15]/28 bg-[#FACC15]/8 text-[#FACC15]",
  },
  {
    title: "Cobrança híbrida",
    description:
      "Mensal, anual e operação fiscal sob demanda dentro do mesmo ecossistema comercial.",
    icon: CircleDollarSign,
    accent: "border-cyan-400/24 bg-cyan-400/8 text-cyan-300",
  },
  {
    title: "Fiscal conectado",
    description:
      "Atendimento, venda e emissão andam juntos para reduzir fricção na operação diária.",
    icon: ReceiptText,
    accent: "border-emerald-400/24 bg-emerald-400/8 text-emerald-300",
  },
];

const publicProofs = [
  "PDV, atendimento e estoque no mesmo fluxo.",
  "Segmento pré-selecionado antes mesmo do cadastro.",
  "Marca WTM forte desde o primeiro acesso.",
];

export function SetupWizard({
  mode = "private",
  canEdit = false,
  companyName = "",
  companyDocument = "",
  companyPhone = "",
  companyAddress = "",
  responsibleName = "",
}: SetupWizardProps) {
  const router = useRouter();
  const isPublicMode = mode === "public";
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

  const isSubmitDisabled = isPublicMode
    ? saving || !selectedSegment
    : !canEdit || saving || !selectedSegment || !companyProfile.name.trim();

  const handleSegmentAction = async (segmentId: CompanySegment) => {
    if (isPublicMode) {
      setSelectedSegment(segmentId);
      setSaving(true);
      router.push(`/cadastro?segment=${segmentId}`);
      return;
    }

    setSelectedSegment(segmentId);
  };

  const handleSave = async () => {
    if (isSubmitDisabled) {
      return;
    }

    if (isPublicMode) {
      router.push(`/cadastro?segment=${selectedSegment}`);
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
      <motion.div
        className="pointer-events-none absolute left-1/2 top-10 w-[480px] max-w-[72vw] -translate-x-1/2 opacity-[0.08]"
        animate={{ y: [0, -14, 0], scale: [1, 1.015, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <LogoHolografica size={480} alt="" animate={false} />
      </motion.div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          {isPublicMode ? (
            <div className="mb-8 flex justify-end">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-[#FACC15]/35 hover:text-[#FACC15]"
              >
                Já sou cliente? Acessar Sistema
              </Link>
            </div>
          ) : null}
          <div className="mx-auto flex max-w-[360px] items-center justify-center">
            <LogoHolografica size={280} showWordmark wordmarkSize="lg" priority />
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {isPublicMode
              ? "Entre no ecossistema WTM com marca forte e segmento certo."
              : "World Tech Manager - Gestão Inteligente"}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            {isPublicMode
              ? "A imagem da sua operação já começa no primeiro passo: escolha o segmento, avance para o cadastro e conecte atendimento, vendas e fiscal no mesmo fluxo."
              : "Defina o DNA da operação e complete a identidade da empresa antes de entrar no dashboard."}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b1121]/85 p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
          {isPublicMode ? (
            <div className="border-b border-white/10 pb-6 text-center">
              <p className="text-sm text-slate-400">
                Novo cliente: escolha um segmento e vá direto para o cadastro.
                Cliente antigo: use o botão de login acima.
              </p>
            </div>
          ) : (
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
          )}

          {isPublicMode ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#07101e] p-6 shadow-[0_0_40px_rgba(0,0,0,0.22)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.14),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_34%)]" />
                <div className="relative">
                  <div className="inline-flex rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#FACC15]">
                    Brand Signal WTM
                  </div>
                  <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-white">
                    Sua operação entra no sistema com presença visual e fluxo comercial definidos.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    O badge oficial da World Tech Manager abre o onboarding com mais impacto visual e deixa clara a proposta: gestão, atendimento e faturamento dentro de uma mesma plataforma.
                  </p>

                  <div className="mt-8 flex justify-center">
                    <div className="rounded-[32px] border border-white/10 bg-[#040913]/70 p-4 shadow-[0_0_35px_rgba(250,204,21,0.08)]">
                      <LogoHolografica
                        size={320}
                        alt="Selo oficial World Tech Manager"
                      />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {publicProofs.map((proof) => (
                      <div
                        key={proof}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200"
                      >
                        {proof}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-4">
                {publicBenefits.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[28px] border border-white/10 bg-[#060d18]/90 p-5"
                    >
                      <div
                        className={`inline-flex rounded-2xl border p-3 ${item.accent}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!isPublicMode && !canEdit ? (
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
                    disabled={!isPublicMode && (!canEdit || saving)}
                    onClick={() => void handleSegmentAction(option.id)}
                    className={`group rounded-3xl border p-5 text-left transition-all duration-300 ${
                      isSelected && !isPublicMode
                        ? "border-[#FACC15] bg-[#FACC15]/12 shadow-[0_0_30px_rgba(250,204,21,0.12)]"
                        : "border-white/10 bg-white/5 hover:border-[#FACC15]/40 hover:bg-white/8"
                    } ${!isPublicMode && !canEdit ? "cursor-not-allowed opacity-60" : ""}`}
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

          {!isPublicMode ? (
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
          ) : (
            <div className="mt-8 rounded-3xl border border-white/10 bg-[#060b16]/80 p-6 text-center">
              <p className="text-sm font-medium text-[#FACC15]">
                Segmentação inteligente
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ao escolher um card, o World Tech Manager envia você para o
                cadastro com o segmento já pré-selecionado.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#060b16]/80 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#FACC15]">
                {isPublicMode ? "Fluxo de entrada" : "Pronto para entrar"}
              </p>
              <p className="mt-1 text-lg text-white">
                {selectedOption?.title || "Escolha um segmento para continuar"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {selectedOption?.description ||
                  (isPublicMode
                    ? "Cliente antigo faz login. Novo cliente escolhe o segmento, mantém a identidade WTM em destaque e segue para criar a conta."
                    : "Depois disso o menu lateral, os labels e os módulos passam a refletir o perfil da empresa.")}
              </p>
              {error ? (
                <p className="mt-3 text-sm text-red-300">{error}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {!isPublicMode ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  Sair
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  Já sou cliente? Acessar Sistema
                </Link>
              )}
              {!isPublicMode ? (
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
