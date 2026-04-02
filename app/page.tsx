import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Car,
  Globe2,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const segmentCards = [
  {
    id: "TECH",
    title: "Assistência Técnica",
    description: "Ordens de serviço, garantia, IMEI/Serial e fluxo técnico.",
    icon: Wrench,
  },
  {
    id: "AUTO",
    title: "Auto Center",
    description: "Checklist automotivo, placa/chassi e atendimento de oficina.",
    icon: Car,
  },
  {
    id: "RETAIL",
    title: "Loja / Varejo",
    description: "PDV rápido, código de barras, estoque e venda direta.",
    icon: ShoppingBag,
  },
  {
    id: "BEAUTY",
    title: "Beleza",
    description: "Agendamentos, carteira de clientes e procedimentos.",
    icon: Sparkles,
  },
  {
    id: "FOOD",
    title: "Alimentação",
    description: "Pedidos rápidos, balcão e operação enxuta.",
    icon: UtensilsCrossed,
  },
] as const;

export default async function RootPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.segment || currentUser?.isDeveloper) {
    redirect("/dashboard");
  }

  if (currentUser) {
    redirect("/setup");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050c1a] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.2),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_28%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex justify-end">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-[#FACC15]/35 hover:text-[#FACC15]"
          >
            Já é cliente? Acessar Sistema
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mx-auto mt-8 max-w-3xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#FACC15]/30 bg-[#FACC15]/10 shadow-[0_0_30px_rgba(250,204,21,0.14)]">
            <Globe2 className="h-11 w-11 text-[#FACC15]" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.45em] text-[#FACC15]">
            World Tech Manager
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Escolha o DNA do seu negócio
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            O World Tech Manager adapta menus, labels e fluxo operacional desde o
            primeiro acesso. Selecione o segmento e siga para criar sua conta.
          </p>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#0b1121]/85 p-6 shadow-[0_0_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#FACC15]">
              Onboarding por Segmento
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Comece pela especialidade da sua empresa
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Novo cliente: escolha um segmento e crie a conta com essa base já
              definida. Cliente atual: entre direto no sistema.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {segmentCards.map((segment) => {
              const Icon = segment.icon;

              return (
                <Link
                  key={segment.id}
                  href={`/cadastro?segment=${segment.id}`}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-5 text-left transition-all duration-300 hover:border-[#FACC15]/40 hover:bg-white/8 hover:shadow-[0_0_30px_rgba(250,204,21,0.08)]"
                >
                  <div className="inline-flex rounded-2xl bg-white/8 p-3 text-[#FACC15] transition-colors group-hover:bg-[#FACC15] group-hover:text-[#050c1a]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    {segment.id}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {segment.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {segment.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#FACC15]">
                    Criar conta para este segmento
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
