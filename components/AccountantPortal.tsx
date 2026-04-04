"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CircleHelp,
  Download,
  ExternalLink,
  FileBadge2,
  FileDown,
  LoaderCircle,
  MapPinned,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  COMPANY_TAX_REGIME_LABELS,
  type CompanyTaxRegimeValue,
} from "@/lib/company-tax-regime";

type XmlDownloadLog = {
  id: string;
  year: number;
  month: number;
  backupReference: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  notes: string | null;
  createdAt: string;
};

type PortalState = {
  cnpj: string;
  legalName: string;
  addressState: string;
  email: string;
  stateRegistration: string;
  municipalRegistration: string;
  taxRegime: CompanyTaxRegimeValue | "";
  certificateA1: string;
  certificateFileBase64: string;
  certificatePassword: string;
  certificateUploadedAt: string | null;
  cscId: string;
  cscToken: string;
  focusSyncStatus: string | null;
  focusSyncMessage: string | null;
  focusSyncedAt: string | null;
  xmlDownloadLogs: XmlDownloadLog[];
};

const SEFAZ_LINKS = [
  { uf: "AC", name: "Acre", href: "https://www.sefaznet.ac.gov.br/" },
  { uf: "AL", name: "Alagoas", href: "https://www.sefaz.al.gov.br/" },
  { uf: "AM", name: "Amazonas", href: "https://www.sefaz.am.gov.br/" },
  { uf: "AP", name: "Amapa", href: "https://www.sefaz.ap.gov.br/" },
  { uf: "BA", name: "Bahia", href: "https://www.sefaz.ba.gov.br/" },
  { uf: "CE", name: "Ceara", href: "https://www.sefaz.ce.gov.br/" },
  { uf: "DF", name: "Distrito Federal", href: "https://www.receita.fazenda.df.gov.br/" },
  { uf: "ES", name: "Espirito Santo", href: "https://sefaz.es.gov.br/" },
  { uf: "GO", name: "Goias", href: "https://www.economia.go.gov.br/" },
  { uf: "MA", name: "Maranhao", href: "https://sistemas1.sefaz.ma.gov.br/" },
  { uf: "MG", name: "Minas Gerais", href: "https://portalsped.fazenda.mg.gov.br/" },
  { uf: "MS", name: "Mato Grosso do Sul", href: "https://www.sefaz.ms.gov.br/" },
  { uf: "MT", name: "Mato Grosso", href: "https://www.sefaz.mt.gov.br/" },
  { uf: "PA", name: "Para", href: "https://www.sefa.pa.gov.br/" },
  { uf: "PB", name: "Paraiba", href: "https://www.sefaz.pb.gov.br/" },
  { uf: "PE", name: "Pernambuco", href: "https://www.sefaz.pe.gov.br/" },
  { uf: "PI", name: "Piaui", href: "https://portal.sefaz.pi.gov.br/" },
  { uf: "PR", name: "Parana", href: "https://sped.fazenda.pr.gov.br/" },
  { uf: "RJ", name: "Rio de Janeiro", href: "https://portal.fazenda.rj.gov.br/" },
  { uf: "RN", name: "Rio Grande do Norte", href: "https://uvt2.set.rn.gov.br/" },
  { uf: "RO", name: "Rondonia", href: "https://portalcontribuinte.sefin.ro.gov.br/" },
  { uf: "RR", name: "Roraima", href: "https://www.sefaz.rr.gov.br/" },
  { uf: "RS", name: "Rio Grande do Sul", href: "https://www.sefaz.rs.gov.br/" },
  { uf: "SC", name: "Santa Catarina", href: "https://www.sef.sc.gov.br/" },
  { uf: "SE", name: "Sergipe", href: "https://www.sefaz.se.gov.br/" },
  { uf: "SP", name: "Sao Paulo", href: "https://portal.fazenda.sp.gov.br/" },
  { uf: "TO", name: "Tocantins", href: "https://www.to.gov.br/sefaz/" },
] as const;

const HELP_STEPS = [
  {
    title: "Passo 1 (Credenciamento)",
    description:
      "Clique no link da SEFAZ abaixo para garantir que o CNPJ esta credenciado como emissor de NF-e/NFC-e em ambiente de Producao.",
  },
  {
    title: "Passo 2 (Certificado)",
    description:
      "Faca o upload do arquivo .pfx (A1) e informe a senha correta. O WTM cuidara da assinatura digital.",
  },
  {
    title: "Passo 3 (CSC)",
    description:
      "Para notas de balcao (NFC-e), insira o ID CSC e o Codigo Token gerados no portal da SEFAZ.",
  },
  {
    title: "Passo 4 (Sincronizar)",
    description:
      'Clique em "Salvar Configuracao" para validar os dados na API da Focus NFe.',
  },
] as const;

const createInitialState = (): PortalState => ({
  cnpj: "",
  legalName: "",
  addressState: "",
  email: "",
  stateRegistration: "",
  municipalRegistration: "",
  taxRegime: "",
  certificateA1: "",
  certificateFileBase64: "",
  certificatePassword: "",
  certificateUploadedAt: null,
  cscId: "",
  cscToken: "",
  focusSyncStatus: null,
  focusSyncMessage: null,
  focusSyncedAt: null,
  xmlDownloadLogs: [],
});

export function AccountantPortal() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState(createInitialState);
  const [saving, setSaving] = useState(false);
  const [savingStatePreference, setSavingStatePreference] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch("/api/config/contador", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Erro ao carregar portal.");
        setForm({
          cnpj: String(payload.cnpj || ""),
          legalName: String(payload.legalName || ""),
          addressState: String(payload.addressState || ""),
          email: String(payload.email || ""),
          stateRegistration: String(payload.stateRegistration || ""),
          municipalRegistration: String(payload.municipalRegistration || ""),
          taxRegime: String(payload.taxRegime || "") as PortalState["taxRegime"],
          certificateA1: String(payload.certificateA1 || ""),
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
          xmlDownloadLogs: Array.isArray(payload.xmlDownloadLogs)
            ? payload.xmlDownloadLogs
            : [],
        });
      })
      .catch((error) => {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "Erro ao carregar portal.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("access") === "restricted") {
      setMessage(
        searchParams.get("message") || "Acesso restrito às ferramentas fiscais",
      );
    }
  }, [searchParams]);

  const certificateStatus = useMemo(() => {
    if (!form.certificateA1) return "Sem certificado";
    if (!form.certificateUploadedAt) return "Configurado";
    const uploadedAt = new Date(form.certificateUploadedAt).getTime();
    const ageInDays = (Date.now() - uploadedAt) / (1000 * 60 * 60 * 24);
    return ageInDays > 300 ? "Atenção" : "Ativo";
  }, [form.certificateA1, form.certificateUploadedAt]);

  const selectedSefazLink = useMemo(
    () =>
      SEFAZ_LINKS.find(
        (link) => link.uf === String(form.addressState || "").toUpperCase(),
      ) || null,
    [form.addressState],
  );

  const handleCertificateUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = () => reject(new Error("Falha ao ler certificado."));
        reader.readAsDataURL(file);
      });

      setForm((current) => ({
        ...current,
        certificateA1: file.name,
        certificateFileBase64: base64,
        certificateUploadedAt: new Date().toISOString(),
      }));
      setMessage("Certificado carregado em Base64.");
    } catch (error) {
      console.error(error);
      setMessage("Nao foi possivel processar o certificado.");
    } finally {
      event.target.value = "";
    }
  };

  const handleStatePreferenceChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextState = String(event.target.value || "").toUpperCase();

    setForm((current) => ({
      ...current,
      addressState: nextState,
    }));

    if (!nextState) {
      return;
    }

    try {
      setSavingStatePreference(true);
      const response = await fetch("/api/config/contador", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressState: nextState,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao salvar UF da empresa.");
      }

      setForm((current) => ({
        ...current,
        addressState: String(payload.addressState || nextState),
      }));
      setMessage(`UF fiscal definida como ${nextState}.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao salvar UF fiscal.");
    } finally {
      setSavingStatePreference(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/config/contador", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: form.legalName || null,
          addressState: form.addressState || null,
          email: form.email || null,
          stateRegistration: form.stateRegistration || null,
          municipalRegistration: form.municipalRegistration || null,
          taxRegime: form.taxRegime || null,
          certificateA1: form.certificateA1 || null,
          certificateFileBase64: form.certificateFileBase64 || null,
          certificatePassword: form.certificatePassword || null,
          certificateUploadedAt: form.certificateUploadedAt,
          cscId: form.cscId || null,
          cscToken: form.cscToken || null,
          syncWithFocus: true,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao salvar portal fiscal.");
      }

      setForm((current) => ({
        ...current,
        legalName: String(payload.legalName || current.legalName),
        addressState: String(payload.addressState || current.addressState),
        email: String(payload.email || current.email),
        stateRegistration: String(
          payload.stateRegistration || current.stateRegistration,
        ),
        municipalRegistration: String(
          payload.municipalRegistration || current.municipalRegistration,
        ),
        taxRegime: String(payload.taxRegime || current.taxRegime) as PortalState["taxRegime"],
        focusSyncStatus: payload.focusSyncStatus || null,
        focusSyncMessage: payload.focusSyncMessage || null,
        focusSyncedAt: payload.focusSyncedAt || null,
        xmlDownloadLogs: Array.isArray(payload.xmlDownloadLogs)
          ? payload.xmlDownloadLogs
          : current.xmlDownloadLogs,
      }));
      setMessage("Portal fiscal salvo e sincronizado com a Focus.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao salvar portal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch("/api/config/contador/xmls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Erro ao gerar o ZIP mensal.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `xmls-${year}-${String(month).padStart(2, "0")}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Download do pacote fiscal iniciado.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao baixar XMLs.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#FACC15]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0B1120] text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-4 text-sm text-cyan-50">
          Espaço destinado à configuração técnica e contábil da unidade.
        </div>

        {message ? (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {message}
          </div>
        ) : null}

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="w-full max-w-3xl justify-self-center rounded-3xl border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#FACC15]">
                  Espaco do Contador
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <h1 className="text-3xl font-black text-white">
                    Configuracao Fiscal
                  </h1>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-100 shadow-[0_0_24px_rgba(250,204,21,0.22)] transition-colors hover:bg-amber-400/20"
                    aria-label="Abrir guia de ativacao fiscal"
                  >
                    <CircleHelp className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Credenciamento, certificado A1, CSC e sincronizacao fiscal em um
                  fluxo unico e direto.
                </p>
              </div>
              <ShieldCheck className="mt-1 h-7 w-7 text-[#FACC15]" />
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-[#08101F] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Status do Certificado
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {certificateStatus}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {form.certificateA1 || "Nenhum certificado carregado."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-[#08101F] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Ultima Sincronizacao
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {form.focusSyncStatus || "Pendente"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {form.focusSyncMessage ||
                      "Use o botao de salvar para validar na Focus NFe."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.cnpj}
                  readOnly
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-slate-400 outline-none"
                  placeholder="CNPJ da empresa"
                />
                <input
                  value={form.legalName}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, legalName: e.target.value }))
                  }
                  placeholder="Razao social"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
                <input
                  value={form.stateRegistration}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      stateRegistration: e.target.value,
                    }))
                  }
                  placeholder="Inscricao Estadual"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
                <input
                  value={form.municipalRegistration}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      municipalRegistration: e.target.value,
                    }))
                  }
                  placeholder="Inscricao Municipal"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
                <select
                  value={form.taxRegime}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      taxRegime: e.target.value as PortalState["taxRegime"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                >
                  <option value="">Regime Tributario</option>
                  {Object.entries(COMPANY_TAX_REGIME_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, email: e.target.value }))
                  }
                  placeholder="E-mail fiscal"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
                <input
                  value={form.cscId}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, cscId: e.target.value }))
                  }
                  placeholder="ID CSC"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
                <input
                  value={form.cscToken}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, cscToken: e.target.value }))
                  }
                  placeholder="Token CSC"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-4 font-semibold text-white transition-colors hover:border-[#FACC15]/50">
                  <Upload className="h-4 w-4" />
                  Upload Certificado A1
                  <input
                    type="file"
                    accept=".pfx,.p12,application/x-pkcs12"
                    onChange={handleCertificateUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="password"
                  value={form.certificatePassword}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      certificatePassword: e.target.value,
                    }))
                  }
                  placeholder="Senha do certificado"
                  className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 disabled:opacity-70"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <FileBadge2 className="h-4 w-4" />
                )}
                {saving ? "Sincronizando..." : "Salvar Configuracao"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-amber-100">
                  <MapPinned className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Acesso Rapido
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-white">
                    Credenciamento SEFAZ
                  </h2>
                </div>
              </div>

              {selectedSefazLink ? (
                <div className="mt-5 rounded-[28px] border border-amber-300/20 bg-linear-to-br from-amber-400/12 via-[#0B1120] to-[#112240] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-400/10 text-lg font-black tracking-[0.2em] text-amber-100">
                      {selectedSefazLink.uf}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                        Unidade fiscal ativa
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        Acessar SEFAZ {selectedSefazLink.uf} - Credenciamento
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        Portal da SEFAZ de {selectedSefazLink.name} para conferir
                        credenciamento e habilitacao do emissor em producao.
                      </p>
                      <a
                        href={selectedSefazLink.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#FACC15] px-4 py-3 font-bold text-slate-950 transition-colors hover:bg-yellow-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir portal da SEFAZ
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[28px] border border-dashed border-amber-300/25 bg-amber-400/8 p-5">
                  <p className="text-sm text-slate-300">
                    A UF da empresa ainda nao foi definida. Escolha abaixo para
                    liberar o atalho fiscal do estado correto.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    UF da Unidade
                  </span>
                  <select
                    value={form.addressState}
                    onChange={handleStatePreferenceChange}
                    disabled={savingStatePreference}
                    className="w-full rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15] disabled:opacity-70"
                  >
                    <option value="">Selecionar estado</option>
                    {SEFAZ_LINKS.map((link) => (
                      <option key={link.uf} value={link.uf}>
                        {link.uf} - {link.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  {savingStatePreference
                    ? "Salvando UF da unidade..."
                    : "A UF salva aqui define qual SEFAZ sera destacada no portal."}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Area de Download
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>
                          {String(value).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="rounded-2xl border border-slate-600 bg-[#08101F] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                    >
                      {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-slate-950 disabled:opacity-70"
                >
                  {downloading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading ? "Gerando ZIP..." : "Baixar XMLs do Mes"}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <h2 className="text-lg font-bold text-white">Ultimos XMLs baixados</h2>
                {form.xmlDownloadLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-[#08101F] px-4 py-5 text-sm text-slate-400">
                    Nenhum download fiscal registrado ainda.
                  </div>
                ) : (
                  form.xmlDownloadLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-700 bg-[#08101F] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {String(log.month).padStart(2, "0")}/{log.year}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(log.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <FileDown className="h-5 w-5 text-cyan-300" />
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {log.notes || "Pacote fiscal consolidado."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {showHelpModal ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-amber-300/20 bg-[#08101F] shadow-[0_30px_90px_rgba(2,6,23,0.65)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-linear-to-r from-[#112240] via-[#0B1120] to-[#08101F] px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                    Guia Contador-Friendly
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Como ativar a unidade para emissao fiscal
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Fechar guia"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-6">
                {HELP_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-amber-300/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm font-black text-amber-100">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!form.certificateA1 ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <span>
                Certificado A1 ausente. O contador precisa subir um arquivo válido
                antes de consultar notas recebidas.
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
