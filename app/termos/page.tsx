import Link from "next/link";
import BackButton from "@/components/BackButton";

const termsSections = [
  {
    title: "Entidade",
    content:
      "LUIZ PAULO B. BRAGA (CNPJ: 62.873.388/0001-92).",
  },
  {
    title: "Licença de Uso",
    content:
      "O sistema funciona como um PWA (Progressive Web App) licenciado para uso em gestão empresarial.",
  },
  {
    title: "Responsabilidade de Acesso",
    content:
      "O administrador é inteiramente responsável pela guarda da sua senha mestre e pelo gerenciamento das permissões de seus atendentes.",
  },
  {
    title: "Período de Teste",
    content:
      "Oferecemos 7 dias de acesso gratuito para avaliação das funcionalidades. Após esse período, o acesso será vinculado à manutenção da assinatura ativa.",
  },
  {
    title: "Uso do Leitor e Câmera",
    content:
      "O sistema solicita acesso à câmera do dispositivo exclusivamente para a leitura de códigos de barras de produtos.",
  },
  {
    title: "Cancelamento",
    content:
      "O usuário pode cancelar sua assinatura a qualquer momento diretamente pelo painel de configurações, cessando o acesso imediato aos módulos financeiros e de relatórios.",
  },
];

export default function TermosPage() {
  return (
    <div className="min-h-screen w-full bg-[#020617] px-4 py-10 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[#1E293B] bg-[#0B1120]/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8 border-b border-[#1E293B] pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400/80">
            World Tech Manager
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Termos de Uso
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Condições técnicas e operacionais para uso do sistema na gestão da
            sua empresa.
          </p>
        </div>

        <div className="space-y-6">
          {termsSections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-[#111827]/50 p-5"
            >
              <h2 className="text-lg font-semibold text-amber-300">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#1E293B] pt-6 text-sm">
          <Link
            href="/privacidade"
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-amber-400/40 hover:text-white"
          >
            Ver Política de Privacidade
          </Link>
          <Link
            href="/suporte"
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-amber-400/40 hover:text-white"
          >
            Falar com Suporte
          </Link>
        </div>
      </div>
    </div>
  );
}
