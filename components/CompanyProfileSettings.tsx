"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Building2,
  FileText,
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
  saleId?: number | null;
  documentNumber: string;
  amount: number;
  createdAt: string;
};

type CompanyFormState = {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  nfeBalance: number;
  autoTopUp: boolean;
  nfeLogs: NfeLogEntry[];
};

const DEFAULT_LOGO = "/logo.png";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const createInitialState = (): CompanyFormState => ({
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  logoUrl: DEFAULT_LOGO,
  nfeBalance: 0,
  autoTopUp: false,
  nfeLogs: [],
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });

export function CompanyProfileSettings() {
  const [form, setForm] = useState<CompanyFormState>(createInitialState);
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

      setForm({
        name: payload.name || "",
        cnpj: payload.cnpj || payload.document || "",
        phone: payload.phone || "",
        email: payload.email || "",
        address: payload.address || "",
        logoUrl: payload.logoUrl || DEFAULT_LOGO,
        nfeBalance: Number(payload.nfeBalance || 0),
        autoTopUp: Boolean(payload.autoTopUp),
        nfeLogs: Array.isArray(payload.nfeLogs) ? payload.nfeLogs : [],
      });
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
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem valido.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("A logo deve ter no maximo 2 MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({
        ...current,
        logoUrl: dataUrl,
      }));
      setMessage("Logo pronta para salvar.");
    } catch (error) {
      console.error(error);
      setMessage("Nao foi possivel processar a imagem.");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          cnpj: form.cnpj,
          phone: form.phone,
          email: form.email,
          address: form.address,
          logoUrl: form.logoUrl,
          autoTopUp: form.autoTopUp,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erro ao salvar empresa.");
      }

      setForm((current) => ({
        ...current,
        name: payload.name || current.name,
        cnpj: payload.cnpj || payload.document || current.cnpj,
        phone: payload.phone || "",
        email: payload.email || "",
        address: payload.address || "",
        logoUrl: payload.logoUrl || DEFAULT_LOGO,
        nfeBalance: Number(payload.nfeBalance || current.nfeBalance || 0),
        autoTopUp: Boolean(payload.autoTopUp),
        nfeLogs: Array.isArray(payload.nfeLogs) ? payload.nfeLogs : current.nfeLogs,
      }));

      setMessage("Dados da empresa salvos com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Erro ao salvar empresa.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRecharge = async () => {
    setRecharging(true);
    setMessage("");

    const checkoutWindow =
      typeof window !== "undefined"
        ? window.open("about:blank", "_blank", "noopener,noreferrer")
        : null;

    try {
      const response = await fetch("/api/mercadopago/nfe-wallet/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: DEFAULT_NFE_RECHARGE_AMOUNT,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(
          payload?.error || "Nao foi possivel iniciar a recarga de saldo.",
        );
      }

      if (checkoutWindow) {
        checkoutWindow.location.href = payload.checkoutUrl;
      } else {
        window.location.href = payload.checkoutUrl;
      }

      setMessage(
        `Checkout aberto para recarga de ${formatCurrency(payload.amount || DEFAULT_NFE_RECHARGE_AMOUNT)}.`,
      );
    } catch (error) {
      if (checkoutWindow) {
        checkoutWindow.close();
      }

      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel abrir o checkout de recarga.",
      );
    } finally {
      setRecharging(false);
    }
  };

  const isLowBalance = form.nfeBalance < LOW_BALANCE_THRESHOLD;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1120] px-6 text-slate-200">
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
        <header className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FACC15]">
                Minha Empresa
              </p>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-white">
                <Building2 className="h-8 w-8 text-[#FACC15]" />
                Cadastro da Empresa World Tech Manager
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                O World Tech Manager usa estes dados em cupom, O.S., garantia,
                PDF e agora na carteira de emissao de notas.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Acesso protegido para ADMIN
            </div>
          </div>
        </header>

        <section
          id="creditos-notas"
          className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#FACC15]/10 p-3 text-[#FACC15]">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FACC15]">
                    Créditos para Notas Fiscais
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Saldo para Emissão de Notas
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Cada emissao consome {formatCurrency(NFE_EMISSION_COST)} do seu
                saldo pré-pago. A recarga sugerida abre um checkout do Mercado
                Pago em nova aba.
              </p>
              <p
                className={`mt-5 text-4xl font-black tracking-tight ${
                  isLowBalance ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {formatCurrency(form.nfeBalance)}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Você tem {formatCurrency(form.nfeBalance)} de saldo para notas.
              </p>
              {isLowBalance ? (
                <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span>
                      Atenção: seu saldo está baixo. Recarregue para evitar
                      interrupções na emissão.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="w-full max-w-xl space-y-4 rounded-[24px] border border-slate-700 bg-[#0B1120] p-5">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Recarga sugerida
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {formatCurrency(DEFAULT_NFE_RECHARGE_AMOUNT)}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Valor ideal para começar a emitir sem interrupções.
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Recarga automática
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Ative para futuras automações de saldo da carteira.
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {recharging ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {recharging ? "Abrindo checkout..." : "Recarregar Saldo"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-700 bg-[#0B1120] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Histórico de consumo
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Últimas 5 notas emitidas e o valor debitado do saldo.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Custo por nota: {formatCurrency(NFE_EMISSION_COST)}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {form.nfeLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-5 text-sm text-slate-400">
                  Nenhuma nota emitida ainda.
                </div>
              ) : (
                form.nfeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-950/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {log.documentNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-amber-300">
                      -{formatCurrency(log.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">
              Dados fiscais e comerciais
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Nome fantasia
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                  placeholder="Ex.: World Tech Manager Auto Center"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cnpj: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                  placeholder="(00) 99999-9999"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  E-mail da empresa
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                  placeholder="contato@wtm.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Endereco completo
                </label>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-white outline-none transition-colors focus:border-[#FACC15]"
                  placeholder="Rua, numero, bairro, cidade e UF"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Logo da empresa</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              A imagem enviada sera usada nos documentos. Se nenhuma logo for
              cadastrada, o World Tech Manager utiliza a logo padrao.
            </p>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-dashed border-slate-700 bg-[#0B1120] p-5">
              <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-slate-800 bg-white p-6">
                <img
                  src={form.logoUrl || DEFAULT_LOGO}
                  alt={form.name || "Logo da empresa"}
                  className="max-h-40 w-auto object-contain"
                />
              </div>

              <div className="mt-5 grid gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 font-semibold text-slate-100 transition-colors hover:border-[#FACC15] hover:text-white">
                  <Upload className="h-4 w-4" />
                  Enviar nova logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      logoUrl: DEFAULT_LOGO,
                    }))
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-transparent px-4 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                >
                  <ImagePlus className="h-4 w-4" />
                  Restaurar logo padrao
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Persistencia por empresa
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                O salvamento e vinculado automaticamente ao `companyId` do
                usuario autenticado.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] px-5 py-3 font-black text-slate-950 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Salvando..." : "Salvar Empresa"}
            </button>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm text-slate-200">
              {message}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
