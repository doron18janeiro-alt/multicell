"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  Building2,
  ImagePlus,
  LoaderCircle,
  Save,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import {
  DEFAULT_NFE_RECHARGE_AMOUNT,
  LOW_BALANCE_THRESHOLD,
  NFE_EMISSION_COST,
} from "@/lib/nfe-wallet";

type NfeLogEntry = {
  id: string;
  documentNumber: string;
  amount: number;
  createdAt: string;
};

type FormState = {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  zipCode: string;
  logoUrl: string | null;
  nfeBalance: number;
  autoTopUp: boolean;
  nfeLogs: NfeLogEntry[];
};

const DEFAULT_LOGO = "/wtm-float.png";
const MAX_LOGO_UPLOAD_SIZE = 10 * 1024 * 1024;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const digitsOnly = (value: string) => value.replace(/\D+/g, "");

const formatCnpj = (value: string) =>
  digitsOnly(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const formatCep = (value: string) =>
  digitsOnly(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const createInitialState = (): FormState => ({
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
  zipCode: "",
  logoUrl: DEFAULT_LOGO,
  nfeBalance: 0,
  autoTopUp: false,
  nfeLogs: [],
});

const mapPayloadToForm = (payload: Record<string, unknown>): FormState => ({
  name: String(payload.name || ""),
  cnpj: formatCnpj(String(payload.cnpj || payload.document || "")),
  phone: String(payload.phone || ""),
  email: String(payload.email || ""),
  addressStreet: String(payload.addressStreet || ""),
  addressNumber: String(payload.addressNumber || ""),
  addressComplement: String(payload.addressComplement || ""),
  addressDistrict: String(payload.addressDistrict || ""),
  addressCity: String(payload.addressCity || ""),
  addressState: String(payload.addressState || ""),
  zipCode: formatCep(String(payload.zipCode || "")),
  logoUrl: String(payload.logoUrl || "") || null,
  nfeBalance: Number(payload.nfeBalance || 0),
  autoTopUp: Boolean(payload.autoTopUp),
  nfeLogs: Array.isArray(payload.nfeLogs) ? (payload.nfeLogs as NfeLogEntry[]) : [],
});

const buildAddress = (form: FormState) =>
  [
    [form.addressStreet, form.addressNumber].filter(Boolean).join(", "),
    [form.addressComplement, form.addressDistrict].filter(Boolean).join(" • "),
    [form.addressCity, form.addressState].filter(Boolean).join(" / "),
    form.zipCode,
  ]
    .filter(Boolean)
    .join(" - ");

export function CompanyProfileSettings() {
  const [form, setForm] = useState<FormState>(createInitialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao carregar empresa.");
      }

      setForm(mapPayloadToForm(payload));
    } catch (error) {
      console.error(error);
      setMessage("Nao foi possivel carregar os dados da empresa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCompany();
  }, [fetchCompany]);

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem valido.");
      return;
    }

    if (file.size > MAX_LOGO_UPLOAD_SIZE) {
      setMessage("A logo deve ter no maximo 10 MB.");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/company/upload-logo", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao enviar logo.");
      }

      setForm((current) => ({ ...current, logoUrl: payload.logoUrl || null }));
      setMessage("Logo atualizada com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao enviar logo.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/company/upload-logo", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao remover logo.");
      }

      setForm((current) => ({ ...current, logoUrl: null }));
      setMessage("Logo removida com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao remover logo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          cnpj: digitsOnly(form.cnpj),
          phone: form.phone,
          email: form.email,
          address: buildAddress(form),
          addressStreet: form.addressStreet,
          addressNumber: form.addressNumber,
          addressComplement: form.addressComplement,
          addressDistrict: form.addressDistrict,
          addressCity: form.addressCity,
          addressState: form.addressState.toUpperCase(),
          zipCode: digitsOnly(form.zipCode),
          logoUrl: form.logoUrl,
          autoTopUp: form.autoTopUp,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao salvar empresa.");
      }

      setForm(mapPayloadToForm(payload));
      setMessage("Dados da empresa salvos com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao salvar empresa.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecharge = async () => {
    setRecharging(true);
    setMessage("");

    try {
      const response = await fetch("/api/mercadopago/nfe-wallet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: DEFAULT_NFE_RECHARGE_AMOUNT }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Nao foi possivel abrir o checkout.");
      }

      window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      setMessage(`Checkout aberto para ${formatCurrency(DEFAULT_NFE_RECHARGE_AMOUNT)}.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao recarregar.");
    } finally {
      setRecharging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] text-slate-200">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-[#112240] px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#FACC15]" />
          Carregando dados da empresa...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FACC15]">
                Minha Empresa
              </p>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white">
                <Building2 className="h-8 w-8 text-[#FACC15]" />
                Painel do Dono da Operação
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Logo, identidade visual, contato da unidade e gestão de créditos fiscais
                ficam aqui. A configuração técnica foi centralizada no Espaço do Contador.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Visão administrativa da empresa
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#FACC15]/10 p-3 text-[#FACC15]">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FACC15]">
                    Créditos de Notas
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Carteira Fiscal da Unidade
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Cada emissão consome {formatCurrency(NFE_EMISSION_COST)} do saldo
                disponível.
              </p>
              <p
                className={`mt-5 text-4xl font-black tracking-tight ${
                  form.nfeBalance < LOW_BALANCE_THRESHOLD
                    ? "text-amber-300"
                    : "text-emerald-300"
                }`}
              >
                {formatCurrency(form.nfeBalance)}
              </p>
            </div>

            <div className="w-full max-w-xl space-y-4 rounded-[24px] border border-slate-700 bg-[#0B1120] p-5">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Área técnica fiscal
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  CSC, regime tributário e certificado A1 foram movidos para o
                  Espaço do Contador.
                </p>
                <Link
                  href="/configuracoes/contador"
                  className="mt-4 inline-flex rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100"
                >
                  Abrir Espaço do Contador
                </Link>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">Recarga automática</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Mantém o saldo da carteira preparado para emissões futuras.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.autoTopUp}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      autoTopUp: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-600 bg-[#0B1120] text-[#FACC15] focus:ring-[#FACC15]"
                />
              </label>

              <button
                type="button"
                onClick={handleRecharge}
                disabled={recharging}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 disabled:opacity-70"
              >
                {recharging ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {recharging ? "Abrindo checkout..." : "Recarregar saldo"}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Contato e Identidade</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2"
                placeholder="Nome fantasia"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="CNPJ"
                value={form.cnpj}
                onChange={(e) => setForm((c) => ({ ...c, cnpj: formatCnpj(e.target.value) }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2"
                placeholder="E-mail"
                value={form.email}
                onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2"
                placeholder="Logradouro"
                value={form.addressStreet}
                onChange={(e) => setForm((c) => ({ ...c, addressStreet: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="Número"
                value={form.addressNumber}
                onChange={(e) => setForm((c) => ({ ...c, addressNumber: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="Complemento"
                value={form.addressComplement}
                onChange={(e) => setForm((c) => ({ ...c, addressComplement: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="Bairro"
                value={form.addressDistrict}
                onChange={(e) => setForm((c) => ({ ...c, addressDistrict: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="Cidade"
                value={form.addressCity}
                onChange={(e) => setForm((c) => ({ ...c, addressCity: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white uppercase outline-none"
                placeholder="UF"
                value={form.addressState}
                onChange={(e) => setForm((c) => ({ ...c, addressState: e.target.value.toUpperCase() }))}
                maxLength={2}
              />
              <input
                className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none"
                placeholder="CEP"
                value={form.zipCode}
                onChange={(e) => setForm((c) => ({ ...c, zipCode: formatCep(e.target.value) }))}
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Logo e Marca da Unidade</h2>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-dashed border-slate-700 bg-[#0B1120] p-5">
              <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-slate-800 bg-[linear-gradient(135deg,#f8fafc_0%,#f8fafc_48%,#08111e_52%,#08111e_100%)] p-6">
                <img
                  src={form.logoUrl || DEFAULT_LOGO}
                  alt={form.name || "Logo"}
                  className="max-h-40 w-auto object-contain"
                />
              </div>

              <div className="mt-4 grid gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 font-semibold text-slate-100">
                  <Upload className="h-4 w-4" />
                  Enviar nova logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={saving}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleRemoveLogo()}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-300"
                >
                  <ImagePlus className="h-4 w-4" />
                  Remover logo
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Salvar dados da empresa</h2>
              <p className="mt-2 text-sm text-slate-400">
                Esta tela grava na mesma tabela `Company`, mas sem expor campos fiscais técnicos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 disabled:opacity-70"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar Empresa"}
            </button>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm text-slate-200">
              {message}
            </div>
          ) : null}

          {form.nfeLogs.length > 0 ? (
            <div className="mt-5 space-y-3">
              {form.nfeLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{log.documentNumber}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-300">
                    -{formatCurrency(log.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
