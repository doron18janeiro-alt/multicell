"use client";

import { useState, useEffect } from "react";
import { formatCpf } from "@/lib/cpf";
import {
  AUTO_FINANCING_BANKS,
  DEFAULT_AUTO_FINANCING_SETTINGS,
} from "@/lib/auto-financing";
import {
  Settings,
  Save,
  Lock,
  CreditCard,
  TriangleAlert,
  Users,
  UserPlus,
  Trash2,
  Pencil,
} from "lucide-react";
import { getRoleLabel } from "@/lib/roles";

interface CompanyConfig {
  debitRate: number;
  creditRate: number;
  taxPix: number;
  taxCash: number;
  creditInstallmentRate: number;
  bankRates: Record<string, number>;
}

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  cpf: string | null;
  birthDate: string | null;
  role: "FUNCIONARIO" | "CONTADOR";
  commissionRate: number;
}

const createEmptyTeamForm = (): {
  fullName: string;
  email: string;
  password: string;
  cpf: string;
  birthDate: string;
  role: "FUNCIONARIO" | "CONTADOR";
  commissionRate: string;
} => ({
  fullName: "",
  email: "",
  password: "",
  cpf: "",
  birthDate: "",
  role: "FUNCIONARIO",
  commissionRate: "0.00",
});

export default function Configuracoes() {
  const [config, setConfig] = useState<CompanyConfig>({
    debitRate: 1.99,
    creditRate: 3.99,
    taxPix: 0,
    taxCash: 0,
    creditInstallmentRate:
      DEFAULT_AUTO_FINANCING_SETTINGS.creditInstallmentRate,
    bankRates: DEFAULT_AUTO_FINANCING_SETTINGS.bankRates,
  });
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState(createEmptyTeamForm);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchConfig();
    fetchTeam();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data && !data.error) {
        setConfig({
          debitRate: data.debitRate ?? 1.99,
          creditRate: data.creditRate ?? 3.99,
          taxPix: data.taxPix ?? 0,
          taxCash: data.taxCash ?? 0,
          creditInstallmentRate:
            data.creditInstallmentRate ??
            DEFAULT_AUTO_FINANCING_SETTINGS.creditInstallmentRate,
          bankRates:
            data.bankRates || DEFAULT_AUTO_FINANCING_SETTINGS.bankRates,
        });
      }
    } catch (error) {
      console.error("Failed to load config", error);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setMsg("");

    // 1. Save Company Config
    try {
      const resConfig = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debitRate: config.debitRate,
          creditRate: config.creditRate,
          taxPix: config.taxPix,
          taxCash: config.taxCash,
          settings: {
            autoFinancing: {
              creditInstallmentRate: config.creditInstallmentRate,
              bankRates: config.bankRates,
            },
          },
        }),
      });

      // 2. Save User Settings (if changed)
      let userUpdated = false;
      if (email || newPassword) {
        const resUser = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email || undefined,
            password: newPassword || undefined,
          }),
        });
        if (resUser.ok) userUpdated = true;
      }

      if (resConfig.ok) {
        let text = "✅ Taxas da maquininha salvas!";
        if (userUpdated) {
          text += " Credenciais atualizadas!";
          setNewPassword("");
          setEmail("");
        }
        setMsg(text);
      } else {
        setMsg("❌ Erro ao salvar dados.");
      }
    } catch (error) {
      setMsg("❌ Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          password: newPassword || undefined,
        }),
      });
      if (res.ok) {
        setMsg("✅ Credenciais atualizadas com sucesso!");
        setNewPassword("");
        setEmail("");
      } else {
        setMsg("❌ Erro ao atualizar credenciais.");
      }
    } catch (error) {
      setMsg("❌ Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      setTeamLoading(true);
      const response = await fetch("/api/team", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        setMsg(payload.error || "❌ Erro ao carregar equipe.");
        return;
      }

      setTeamMembers(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
      setMsg("❌ Erro ao carregar equipe.");
    } finally {
      setTeamLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Deseja cancelar sua assinatura agora? O logout sera feito imediatamente.",
    );

    if (!confirmed) {
      return;
    }

    setCancelLoading(true);
    setMsg("");

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        setMsg(payload.error || "❌ Erro ao cancelar assinatura.");
        return;
      }

      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      setMsg("❌ Erro de conexão ao cancelar assinatura.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSaveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    setTeamSaving(true);
    setMsg("");

    try {
      const response = await fetch(
        editingMemberId ? `/api/team/${editingMemberId}` : "/api/team",
        {
        method: editingMemberId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teamForm),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        setMsg(payload.error || "❌ Erro ao cadastrar funcionário.");
        return;
      }

      setEditingMemberId(null);
      setTeamForm(createEmptyTeamForm());
      setMsg(
        editingMemberId
          ? "✅ Funcionário atualizado com sucesso!"
          : "✅ Funcionário cadastrado com sucesso!",
      );
      await fetchTeam();
    } catch (error) {
      console.error(error);
      setMsg(
        editingMemberId
          ? "❌ Erro ao atualizar funcionário."
          : "❌ Erro ao cadastrar funcionário.",
      );
    } finally {
      setTeamSaving(false);
    }
  };

  const handleEditEmployee = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setTeamForm({
      fullName: member.fullName,
      email: member.email,
      password: "",
      cpf: member.cpf || "",
      birthDate: member.birthDate
        ? new Date(member.birthDate).toISOString().slice(0, 10)
        : "",
      role: member.role,
      commissionRate: member.commissionRate.toFixed(2),
    });
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setTeamForm(createEmptyTeamForm());
  };

  const handleDeleteEmployee = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `Excluir o funcionário ${member.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        setMsg(payload.error || "❌ Erro ao excluir funcionário.");
        return;
      }

      setMsg("✅ Funcionário excluído com sucesso!");
      await fetchTeam();
    } catch (error) {
      console.error(error);
      setMsg("❌ Erro ao excluir funcionário.");
    }
  };

  return (
    <div className="min-h-full w-full bg-[#0B1120] font-sans text-slate-100">
      <main className="mx-auto w-full max-w-7xl">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="flex items-center gap-3 text-2xl font-light text-white sm:text-3xl">
            <Settings className="text-[#D4AF37]" size={32} strokeWidth={1.5} />
            Configurações do World Tech Manager
          </h1>
          <p className="text-slate-400 mt-2 ml-11">
            Gerencie taxas, financiamento, segurança, assinatura e equipe em um painel limpo.
          </p>
        </header>

        <div className="max-w-6xl space-y-8">
          <section className="rounded-2xl border border-[#FACC15]/20 bg-[#112240]/80 p-5 shadow-xl">
            <p className="text-sm font-medium text-[#FACC15]">
              Dados da empresa foram centralizados.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Nome, CNPJ, endereço, telefone e logo agora são gerenciados exclusivamente em
              <span className="font-semibold text-white"> Minha Empresa</span>.
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
            {/* Taxas do Cartão */}
            <section className="bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <CreditCard size={100} />
              </div>
              <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                <CreditCard size={20} />
                Taxas da Maquininha (%)
              </h2>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Taxa Débito (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.debitRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        debitRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Taxa Crédito (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.creditRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        creditRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Taxa Pix (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.taxPix}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taxPix: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Taxa Dinheiro (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.taxCash}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taxCash: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </section>

            <section className="lg:col-span-2 bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-cyan-300 mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                <CreditCard size={20} />
                Financiamento Auto
              </h2>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <label className="block text-sm text-slate-300 mb-2">
                    Taxa Mensal Base do Cartão Parcelado (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.creditInstallmentRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        creditInstallmentRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-400 outline-none"
                  />
                  <p className="mt-3 text-xs leading-5 text-slate-300">
                    Usada no simulador de parcelamento de 1x a 21x no PDV.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Taxa Base Mensal por Banco (%)
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    O simulador Price usa estas taxas para financiamento de 12x a 60x.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {AUTO_FINANCING_BANKS.map((bank) => (
                      <div
                        key={bank.key}
                        className="rounded-2xl border border-slate-700/60 bg-[#0B1120] p-4"
                      >
                        <label className="block text-sm text-slate-300 mb-2">
                          {bank.label}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.bankRates[bank.key] ?? 0}
                          onChange={(e) =>
                            setConfig((current) => ({
                              ...current,
                              bankRates: {
                                ...current.bankRates,
                                [bank.key]: parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                          className="w-full bg-[#112240] border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-400 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Security */}
            <section className="bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-red-400 mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                <Lock size={20} />
                Segurança
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Novo E-mail de Login
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                    placeholder="novo@email.com (opcional)"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Nova Senha de Acesso
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                    placeholder="Alterar senha..."
                  />
                </div>
              </div>
            </section>

            <button
              onClick={handleSaveAll}
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black font-semibold py-4 rounded-xl hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2 text-lg"
            >
              <Save size={20} />
              SALVAR TAXAS, FINANCIAMENTO E SEGURANÇA
            </button>

            <section className="bg-[#112240]/80 backdrop-blur-sm border border-red-500/25 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                <TriangleAlert size={20} />
                Assinatura
              </h2>
              <p className="text-sm text-slate-300 mb-4">
                Cancele quando quiser. Ao confirmar, sua assinatura será marcada
                como cancelada, um e-mail de confirmação será enviado e sua
                sessão será encerrada imediatamente.
              </p>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-60"
              >
                {cancelLoading
                  ? "Cancelando assinatura..."
                  : "Cancele quando quiser"}
              </button>
            </section>

            {msg && (
              <div
                className={`p-4 rounded-xl border ${
                  msg.includes("✅")
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                } flex items-center justify-center font-medium animate-pulse`}
              >
                {msg}
              </div>
            )}
          </div>
        </div>

        <section className="mt-8 max-w-6xl bg-[#112240]/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6 border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#D4AF37] flex items-center gap-2">
                <Users size={20} />
                Gerenciar Equipe
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Cadastre funcionarios e contadores com niveis de acesso distintos.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Proprietário mantém o controle administrativo.
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={teamForm.fullName}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, fullName: e.target.value })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                    placeholder="Nome do colaborador"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={teamForm.email}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, email: e.target.value })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                    placeholder="funcionario@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={teamForm.password}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, password: e.target.value })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                    placeholder={
                      editingMemberId
                        ? "Deixe em branco para manter a atual"
                        : "Minimo 6 caracteres"
                    }
                    required={!editingMemberId}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={teamForm.cpf}
                    onChange={(e) =>
                      setTeamForm({
                        ...teamForm,
                        cpf: formatCpf(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                    placeholder="000.000.000-00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={teamForm.birthDate}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, birthDate: e.target.value })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Função
                  </label>
                  <select
                    value={teamForm.role}
                    onChange={(e) =>
                      setTeamForm({
                        ...teamForm,
                        role: e.target.value as "FUNCIONARIO" | "CONTADOR",
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                  >
                    <option value="FUNCIONARIO">Funcionario</option>
                    <option value="CONTADOR">Contador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={teamForm.commissionRate}
                    onChange={(e) =>
                      setTeamForm({
                        ...teamForm,
                        commissionRate: e.target.value,
                      })
                    }
                    className="w-full bg-[#0B1120] border border-slate-600 rounded-lg p-3 text-white focus:border-[#D4AF37] outline-none"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={teamSaving}
                  className="w-full bg-linear-to-r from-amber-400 to-yellow-500 text-black font-semibold py-4 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus size={20} />
                  {teamSaving
                    ? editingMemberId
                      ? "Salvando..."
                      : "Cadastrando..."
                    : editingMemberId
                      ? "Salvar Alteracoes"
                      : "Cadastrar Colaborador"}
                </button>

                {editingMemberId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-4 font-semibold text-slate-300 transition-colors hover:border-slate-500"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Colaboradores Cadastrados
              </h3>

              {teamLoading ? (
                <div className="rounded-xl border border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                  Carregando equipe...
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-[#0B1120] p-6 text-center text-slate-400">
                  Nenhum colaborador cadastrado.
                </div>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-slate-700 bg-[#0B1120] p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {member.fullName}
                      </p>
                      <p className="text-sm text-slate-400">{member.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        CPF: {member.cpf || "--"} | Nascimento:{" "}
                        {member.birthDate
                          ? new Date(member.birthDate).toLocaleDateString(
                              "pt-BR",
                            )
                          : "--"}
                      </p>
                      <p className="text-xs text-cyan-300 mt-1 font-semibold">
                        Cargo: {getRoleLabel(member.role)}
                      </p>
                      {member.role !== "CONTADOR" ? (
                        <p className="text-xs text-[#D4AF37] mt-1 font-semibold">
                          Comissão: {member.commissionRate.toFixed(2)}%
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditEmployee(member)}
                        className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-amber-200 hover:bg-amber-400/20 transition-colors flex items-center gap-2"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(member)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-300 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
