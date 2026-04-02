"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Building2,
  ImagePlus,
  LoaderCircle,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";

type CompanyFormState = {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
};

const DEFAULT_LOGO = "/logo.png";

const createInitialState = (): CompanyFormState => ({
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  logoUrl: DEFAULT_LOGO,
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
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
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
        });
      } catch (error) {
        console.error(error);
        setMessage("Nao foi possivel carregar os dados da empresa.");
      } finally {
        setLoading(false);
      }
    };

    void fetchCompany();
  }, []);

  const handleLogoUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
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
      <div className="mx-auto max-w-5xl space-y-6">
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
                O World Tech Manager usa estes dados em cupom, O.S., garantia e
                PDF. O cadastro e a edicao ficam restritos a administradores.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Acesso protegido para ADMIN
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-slate-800 bg-[#112240]/85 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Dados fiscais e comerciais</h2>
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
                  placeholder="contato@sualoja.com.br"
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
              <h2 className="text-lg font-bold text-white">Persistencia por empresa</h2>
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
