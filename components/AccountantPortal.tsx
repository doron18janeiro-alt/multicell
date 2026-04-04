"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Download,
  FileBadge2,
  FileDown,
  LoaderCircle,
  ShieldCheck,
  Upload,
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
  ["AC", "https://www.sefaznet.ac.gov.br/"],
  ["AL", "https://www.sefaz.al.gov.br/"],
  ["AM", "https://www.sefaz.am.gov.br/"],
  ["AP", "https://www.sefaz.ap.gov.br/"],
  ["BA", "https://www.sefaz.ba.gov.br/"],
  ["CE", "https://www.sefaz.ce.gov.br/"],
  ["DF", "https://www.receita.fazenda.df.gov.br/"],
  ["ES", "https://sefaz.es.gov.br/"],
  ["GO", "https://www.economia.go.gov.br/"],
  ["MA", "https://sistemas1.sefaz.ma.gov.br/"],
  ["MG", "https://portalsped.fazenda.mg.gov.br/"],
  ["MS", "https://www.sefaz.ms.gov.br/"],
  ["MT", "https://www.sefaz.mt.gov.br/"],
  ["PA", "https://www.sefa.pa.gov.br/"],
  ["PB", "https://www.sefaz.pb.gov.br/"],
  ["PE", "https://www.sefaz.pe.gov.br/"],
  ["PI", "https://portal.sefaz.pi.gov.br/"],
  ["PR", "https://sped.fazenda.pr.gov.br/"],
  ["RJ", "https://portal.fazenda.rj.gov.br/"],
  ["RN", "https://uvt2.set.rn.gov.br/"],
  ["RO", "https://portalcontribuinte.sefin.ro.gov.br/"],
  ["RR", "https://www.sefaz.rr.gov.br/"],
  ["RS", "https://www.sefaz.rs.gov.br/"],
  ["SC", "https://www.sef.sc.gov.br/"],
  ["SE", "https://www.sefaz.se.gov.br/"],
  ["SP", "https://portal.fazenda.sp.gov.br/"],
  ["TO", "https://www.to.gov.br/sefaz/"],
] as const;

const createInitialState = (): PortalState => ({
  cnpj: "",
  legalName: "",
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
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/config/contador", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: form.legalName || null,
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-4 text-sm text-cyan-50">
          Espaço destinado à configuração técnica e contábil da unidade.
        </div>

        {message ? (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {message}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#FACC15]">
                  Espaço do Contador
                </p>
                <h1 className="mt-2 text-3xl font-black text-white">
                  Configuração Fiscal
                </h1>
              </div>
              <ShieldCheck className="h-7 w-7 text-[#FACC15]" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4">
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

              <input
                value={form.cnpj}
                readOnly
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-slate-400 outline-none"
                placeholder="CNPJ da empresa"
              />
              <input
                value={form.legalName}
                onChange={(e) =>
                  setForm((current) => ({ ...current, legalName: e.target.value }))
                }
                placeholder="Razão social"
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              />
              <input
                value={form.stateRegistration}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    stateRegistration: e.target.value,
                  }))
                }
                placeholder="Inscrição Estadual"
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              />
              <input
                value={form.municipalRegistration}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    municipalRegistration: e.target.value,
                  }))
                }
                placeholder="Inscrição Municipal"
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              />
              <select
                value={form.taxRegime}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    taxRegime: e.target.value as PortalState["taxRegime"],
                  }))
                }
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              >
                <option value="">Regime Tributário</option>
                {Object.entries(COMPANY_TAX_REGIME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={form.cscId}
                onChange={(e) =>
                  setForm((current) => ({ ...current, cscId: e.target.value }))
                }
                placeholder="ID CSC"
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              />
              <input
                value={form.cscToken}
                onChange={(e) =>
                  setForm((current) => ({ ...current, cscToken: e.target.value }))
                }
                placeholder="Token CSC"
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              />

              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4 font-semibold text-white">
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
                className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
              />

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
                {saving ? "Sincronizando..." : "Salvar Configuração Fiscal"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Área de Download
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
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
                      className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none"
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
                  {downloading ? "Gerando ZIP..." : "Baixar XMLs do Mês"}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <h2 className="text-lg font-bold text-white">Últimos XMLs baixados</h2>
                {form.xmlDownloadLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0B1120] px-4 py-5 text-sm text-slate-400">
                    Nenhum download fiscal registrado ainda.
                  </div>
                ) : (
                  form.xmlDownloadLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4"
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

            <div className="rounded-3xl border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white">Links úteis SEFAZ</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {SEFAZ_LINKS.map(([uf, href]) => (
                  <a
                    key={uf}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-4 transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      SEFAZ {uf}
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {href.replace(/^https?:\/\//, "")}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

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
