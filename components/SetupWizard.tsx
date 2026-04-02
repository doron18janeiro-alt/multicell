"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Loader2,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { resetSegmentSessionCache, type CompanySegment } from "@/hooks/useSegment";

type SetupWizardProps = {
  canEdit: boolean;
  companyName: string;
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
    title: "Assistencia Tecnica",
    description: "Ordens de servico, garantia, aparelho e IMEI/Serial.",
    icon: Wrench,
  },
  {
    id: "RETAIL",
    title: "Loja / Varejo",
    description: "PDV rapido, codigo de barras, estoque e venda direta.",
    icon: ShoppingBag,
  },
  {
    id: "AUTO",
    title: "Auto Center",
    description: "OS automotiva, placa/chassi, historico e atendimento.",
    icon: Car,
  },
  {
    id: "BEAUTY",
    title: "Beleza",
    description: "Agenda de servicos, clientes recorrentes e fluxo leve.",
    icon: Sparkles,
  },
  {
    id: "FOOD",
    title: "Alimentacao",
    description: "Cardapio, itens rapidos e operacao objetiva de caixa.",
    icon: UtensilsCrossed,
  },
];

export function SetupWizard({
  canEdit,
  companyName,
  responsibleName,
}: SetupWizardProps) {
  const router = useRouter();
  const [selectedSegment, setSelectedSegment] = useState<CompanySegment | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedOption = useMemo(
    () =>
      segmentOptions.find((option) => option.id === selectedSegment) || null,
    [selectedSegment],
  );

  const handleSave = async () => {
    if (!selectedSegment || saving || !canEdit) {
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
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "Nao foi possivel salvar o segmento.");
        setSaving(false);
        return;
      }

      window.location.assign("/dashboard");
    } catch (requestError) {
      console.error(requestError);
      setError("Falha de conexao ao salvar o segmento.");
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050c1a] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.15),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.1),_transparent_30%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#FACC15]">
            Setup Inicial
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Escolha o DNA da sua operacao
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            O sistema usa essa escolha para adaptar rotulos, fluxos e modulos
            sem criar uma segunda aplicacao.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b1121]/85 p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Empresa</p>
              <h2 className="text-2xl font-semibold text-white">
                {companyName}
              </h2>
            </div>
            <div className="text-sm text-slate-400">
              Responsavel pela configuracao:{" "}
              <span className="font-medium text-white">{responsibleName}</span>
            </div>
          </div>

          {!canEdit ? (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
              Apenas um administrador pode definir o segmento inicial da
              empresa. Entre com a conta principal ou aguarde a configuracao da
              loja.
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#060b16]/80 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#FACC15]">
                Segmento selecionado
              </p>
              <p className="mt-1 text-lg text-white">
                {selectedOption?.title || "Nenhum segmento escolhido ainda"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {selectedOption?.description ||
                  "Selecione um card para liberar o dashboard personalizado da empresa."}
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
                disabled={!selectedSegment || saving || !canEdit}
                className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-[#FACC15] px-6 py-3 text-sm font-semibold text-[#050c1a] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando configuracao...
                  </>
                ) : (
                  "Salvar e entrar no Dashboard"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
