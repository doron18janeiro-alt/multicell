"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  Building2,
  FileBadge2,
  FileText,
  ImagePlus,
  LoaderCircle,
  MapPinned,
  Save,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import {
  DEFAULT_NFE_RECHARGE_AMOUNT,
  LOW_BALANCE_THRESHOLD,
} from "@/lib/nfe-wallet";
import { COMPANY_TAX_REGIME_LABELS } from "@/lib/company-tax-regime";

type NfeLogEntry = {
  id: string;
  documentNumber: string;
  amount: number;
  createdAt: string;
};

type TabKey = "identificacao" | "endereco" | "certificado";

type FormState = {
  name: string;
  cnpj: string;
  legalName: string;
  stateRegistration: string;
  municipalRegistration: string;
  taxRegime: keyof typeof COMPANY_TAX_REGIME_LABELS | "";
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
  certificateFileName: string;
  certificateFileBase64: string;
  certificatePassword: string;
  certificateUploadedAt: string | null;
  cscId: string;
  cscToken: string;
  focusSyncStatus: string | null;
  focusSyncMessage: string | null;
  focusSyncedAt: string | null;
  nfeBalance: number;
  autoTopUp: boolean;
  nfeLogs: NfeLogEntry[];
};

const DEFAULT_LOGO = "/wtm-float.png";
const MAX_LOGO_UPLOAD_SIZE = 10 * 1024 * 1024;
const TABS: Array<{ key: TabKey; label: string; icon: typeof FileText }> = [
  { key: "identificacao", label: "Identificação", icon: FileText },
  { key: "endereco", label: "Endereço & Contato", icon: MapPinned },
  { key: "certificado", label: "Certificado Digital", icon: FileBadge2 },
];

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

const isValidBasicCnpj = (value: string) => {
  const digits = digitsOnly(value);
  return digits.length === 14 && !/^(\d)\1+$/.test(digits);
};

const createInitialState = (): FormState => ({
  name: "",
  cnpj: "",
  legalName: "",
  stateRegistration: "",
  municipalRegistration: "",
  taxRegime: "",
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
  certificateFileName: "",
  certificateFileBase64: "",
  certificatePassword: "",
  certificateUploadedAt: null,
  cscId: "",
  cscToken: "",
  focusSyncStatus: null,
  focusSyncMessage: null,
  focusSyncedAt: null,
  nfeBalance: 0,
  autoTopUp: false,
  nfeLogs: [],
});

const mapPayloadToForm = (payload: Record<string, unknown>): FormState => ({
  name: String(payload.name || ""),
  cnpj: formatCnpj(String(payload.cnpj || payload.document || "")),
  legalName: String(payload.legalName || ""),
  stateRegistration: String(payload.stateRegistration || ""),
  municipalRegistration: String(payload.municipalRegistration || ""),
  taxRegime: String(payload.taxRegime || "") as FormState["taxRegime"],
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
  certificateFileName: String(payload.certificateA1 || ""),
  certificateFileBase64: String(payload.certificateFileBase64 || ""),
  certificatePassword: String(payload.certificatePassword || ""),
  certificateUploadedAt:
    typeof payload.certificateUploadedAt === "string"
      ? payload.certificateUploadedAt
      : null,
  cscId: String(payload.cscId || ""),
  cscToken: String(payload.cscToken || ""),
  focusSyncStatus:
    typeof payload.focusSyncStatus === "string" ? payload.focusSyncStatus : null,
  focusSyncMessage:
    typeof payload.focusSyncMessage === "string" ? payload.focusSyncMessage : null,
  focusSyncedAt:
    typeof payload.focusSyncedAt === "string" ? payload.focusSyncedAt : null,
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
  const [activeTab, setActiveTab] = useState<TabKey>("identificacao");
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
      if (!response.ok) throw new Error(payload.error || "Falha ao enviar logo.");
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
      if (!response.ok) throw new Error(payload.error || "Falha ao remover logo.");
      setForm((current) => ({ ...current, logoUrl: null }));
      setMessage("Logo removida com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao remover logo.");
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(new Error("Falha ao ler o certificado."));
        reader.readAsDataURL(file);
      });

      setForm((current) => ({
        ...current,
        certificateFileName: file.name,
        certificateFileBase64: base64,
        certificateUploadedAt: new Date().toISOString(),
      }));
      setMessage("Certificado convertido para Base64 com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage("Nao foi possivel converter o certificado.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!isValidBasicCnpj(form.cnpj)) {
      setActiveTab("identificacao");
      setMessage("Informe um CNPJ valido antes de sincronizar.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          cnpj: digitsOnly(form.cnpj),
          legalName: form.legalName,
          stateRegistration: form.stateRegistration,
          municipalRegistration: form.municipalRegistration,
          taxRegime: form.taxRegime || null,
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
          certificateA1: form.certificateFileName || null,
          certificateFileBase64: form.certificateFileBase64 || null,
          certificatePassword: form.certificatePassword || null,
          certificateUploadedAt: form.certificateUploadedAt,
          cscId: form.cscId || null,
          cscToken: form.cscToken || null,
          autoTopUp: form.autoTopUp,
          syncWithFocus: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.profile) setForm(mapPayloadToForm(payload.profile));
        throw new Error(payload.error || "Falha ao salvar empresa.");
      }
      setForm(mapPayloadToForm(payload));
      setMessage("Empresa salva e sincronizada com a Focus/SEFAZ.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao sincronizar.");
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
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FACC15]">Minha Empresa</p>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white">
                <Building2 className="h-8 w-8 text-[#FACC15]" />
                Configuração Fiscal Integrada
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              White label WTM
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <div className="flex flex-wrap gap-3">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    activeTab === tab.key
                      ? "border-[#FACC15]/40 bg-[#FACC15]/10 text-[#FACC15]"
                      : "border-slate-700 bg-[#0B1120] text-slate-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {activeTab === "identificacao" ? (
                <>
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2" placeholder="Nome fantasia" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm((c) => ({ ...c, cnpj: formatCnpj(e.target.value) }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Razão social" value={form.legalName} onChange={(e) => setForm((c) => ({ ...c, legalName: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Inscrição Estadual" value={form.stateRegistration} onChange={(e) => setForm((c) => ({ ...c, stateRegistration: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Inscrição Municipal" value={form.municipalRegistration} onChange={(e) => setForm((c) => ({ ...c, municipalRegistration: e.target.value }))} />
                  <select className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2" value={form.taxRegime} onChange={(e) => setForm((c) => ({ ...c, taxRegime: e.target.value as FormState['taxRegime'] }))}>
                    <option value="">Regime tributário</option>
                    {Object.entries(COMPANY_TAX_REGIME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </>
              ) : null}

              {activeTab === "endereco" ? (
                <>
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="CEP" value={form.zipCode} onChange={(e) => setForm((c) => ({ ...c, zipCode: formatCep(e.target.value) }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Telefone" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2" placeholder="Logradouro" value={form.addressStreet} onChange={(e) => setForm((c) => ({ ...c, addressStreet: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Número" value={form.addressNumber} onChange={(e) => setForm((c) => ({ ...c, addressNumber: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Complemento" value={form.addressComplement} onChange={(e) => setForm((c) => ({ ...c, addressComplement: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Bairro" value={form.addressDistrict} onChange={(e) => setForm((c) => ({ ...c, addressDistrict: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Cidade" value={form.addressCity} onChange={(e) => setForm((c) => ({ ...c, addressCity: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="UF" value={form.addressState} onChange={(e) => setForm((c) => ({ ...c, addressState: e.target.value.toUpperCase() }))} maxLength={2} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none sm:col-span-2" placeholder="E-mail" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
                </>
              ) : null}

              {activeTab === "certificado" ? (
                <>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-4 font-semibold text-slate-100 sm:col-span-2">
                    <Upload className="h-4 w-4" />
                    Enviar certificado .pfx / .p12
                    <input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={handleCertificateUpload} className="hidden" />
                  </label>
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-slate-300 outline-none" placeholder="Arquivo carregado" value={form.certificateFileName} readOnly />
                  <input type="password" className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="Senha do certificado" value={form.certificatePassword} onChange={(e) => setForm((c) => ({ ...c, certificatePassword: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="ID CSC" title="Dados obtidos no portal da SEFAZ para emissão de NFC-e." value={form.cscId} onChange={(e) => setForm((c) => ({ ...c, cscId: e.target.value }))} />
                  <input className="rounded-2xl border border-slate-700 bg-[#08101d] px-4 py-3 text-white outline-none" placeholder="CSC Token" title="Dados obtidos no portal da SEFAZ para emissão de NFC-e." value={form.cscToken} onChange={(e) => setForm((c) => ({ ...c, cscToken: e.target.value }))} />
                </>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white">Logo da empresa</h2>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-dashed border-slate-700 bg-[#0B1120] p-5">
                <div className="flex min-h-[200px] items-center justify-center rounded-[20px] border border-slate-800 bg-[linear-gradient(135deg,#f8fafc_0%,#f8fafc_48%,#08111e_52%,#08111e_100%)] p-6">
                  <img src={form.logoUrl || DEFAULT_LOGO} alt={form.name || "Logo"} className="max-h-36 w-auto object-contain" />
                </div>
                <div className="mt-4 grid gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 font-semibold text-slate-100">
                    <Upload className="h-4 w-4" />
                    Enviar nova logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={saving} />
                  </label>
                  <button type="button" onClick={() => void handleRemoveLogo()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-300">
                    <ImagePlus className="h-4 w-4" />
                    Remover logo
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Carteira fiscal</h2>
                <Wallet className="h-5 w-5 text-[#FACC15]" />
              </div>
              <p className={`mt-4 text-3xl font-black ${form.nfeBalance < LOW_BALANCE_THRESHOLD ? "text-amber-300" : "text-emerald-300"}`}>{formatCurrency(form.nfeBalance)}</p>
              <p className="mt-2 text-sm text-slate-400">{form.focusSyncMessage || "Pronto para sincronizar com a Focus."}</p>
              <button type="button" onClick={handleRecharge} disabled={recharging} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 disabled:opacity-70">
                {recharging ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {recharging ? "Abrindo checkout..." : "Recarregar saldo"}
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Persistência e sincronização</h2>
              <p className="mt-2 text-sm text-slate-400">O certificado é convertido para Base64 antes do envio à Focus.</p>
            </div>
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 disabled:opacity-70">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Sincronizando..." : "Salvar e Sincronizar com SEFAZ"}
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
                <div key={log.id} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{log.documentNumber}</p>
                    <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-300">-{formatCurrency(log.amount)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
