import BackButton from "@/components/BackButton";

const whatsappHref =
  "https://wa.me/5545991291742?text=" +
  encodeURIComponent("Olá Luiz, preciso de suporte no World Tech Manager");

export default function SuportePage() {
  return (
    <div className="min-h-screen w-full bg-[#020617] px-4 py-10 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-[#1E293B] bg-[#0B1120]/90 p-8 text-center shadow-2xl backdrop-blur-md sm:p-10">
          <div className="mb-6 flex justify-start">
            <BackButton />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400/80">
            Suporte Técnico
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Atendimento direto com o desenvolvedor
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            Para suporte técnico especializado, dúvidas sobre o sistema ou
            solicitações de novas funcionalidades, fale diretamente com Luiz
            Paulo B. Braga.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111827]/50 p-5 text-left">
            <p className="text-sm text-slate-400">Engenheiro Responsável</p>
            <p className="mt-1 text-lg font-semibold text-white">
              Luiz Paulo B. Braga
            </p>
            <p className="mt-3 text-sm text-slate-400">WhatsApp Direto</p>
            <p className="mt-1 text-base font-medium text-amber-300">
              +55 45 99129-1742
            </p>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 text-base font-bold text-[#0B1120] shadow-[0_0_30px_rgba(250,204,21,0.2)] transition-transform hover:scale-[1.01] sm:w-auto"
          >
            Falar com Suporte Técnico
          </a>
        </div>
      </div>
    </div>
  );
}
