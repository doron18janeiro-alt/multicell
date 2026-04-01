import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAuditDateTime } from "@/lib/audit";
import {
  getCurrentUser,
  getResponsibleEngineerEmail,
  isResponsibleEngineerUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const actionStyles: Record<string, string> = {
  UPDATE: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-100",
  INSERT: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
};

export default async function AdminLogsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!isResponsibleEngineerUser(currentUser)) {
    redirect("/dashboard?access=denied");
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      companyId: currentUser.companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <div className="min-h-full w-full bg-[#0B1120] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-[#112240]/90 p-6 shadow-[0_25px_80px_rgba(2,6,23,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
            Painel Oculto
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Auditoria Financeira
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Registro de alteracoes e exclusoes em vendas e despesas. Acesso
                restrito ao engenheiro responsavel configurado em{" "}
                <span className="font-semibold text-slate-200">ADMIN_EMAIL</span>{" "}
                ({getResponsibleEngineerEmail()}).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-[#0B1120]/80 px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">{logs.length}</span>{" "}
              evento(s) mais recentes
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#112240]/90 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              Historico de Logs
            </h2>
          </div>

          {logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              Nenhum log registrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {logs.map((log) => (
                <article key={log.id} className="px-6 py-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                            actionStyles[log.action] ||
                            "border-slate-700 bg-slate-800 text-slate-200"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                          {log.tableName}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {log.userName}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-slate-200">
                        {log.description}
                      </p>
                    </div>

                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {formatAuditDateTime(log.createdAt)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
