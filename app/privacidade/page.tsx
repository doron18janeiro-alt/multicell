import Link from "next/link";
import BackButton from "@/components/BackButton";

const privacySections = [
  {
    title: "Responsável",
    content:
      "LUIZ PAULO B. BRAGA – Engenheiro de Software (CNPJ: 62.873.388/0001-92).",
  },
  {
    title: "Escopo",
    content:
      "Esta Política de Privacidade descreve como o Multicell System coleta, utiliza e protege as informações no âmbito da prestação de serviços de gestão para assistências técnicas.",
  },
  {
    title: "Coleta de Dados",
    content:
      "Coletamos dados essenciais para a operação do sistema, incluindo nome completo, CPF/CNPJ, e-mail de login, dados de contato de clientes e registros de Ordens de Serviço.",
  },
  {
    title: "Uso das Informações",
    content:
      "Os dados são processados exclusivamente para a gestão de vendas, controle de estoque, emissão de termos de serviço e gestão financeira da sua unidade.",
  },
  {
    title: "Segurança e Armazenamento",
    content:
      "Utilizamos infraestrutura de nuvem de alta performance (Supabase/Vercel) com criptografia de ponta para garantir a integridade dos dados e das senhas de acesso.",
  },
  {
    title: "Compartilhamento",
    content:
      "Não compartilhamos dados com terceiros para fins publicitários. Dados financeiros podem ser processados por gateways de pagamento integrados (Mercado Pago), seguindo rigorosos padrões de segurança.",
  },
  {
    title: "Seus Direitos",
    content:
      "Em conformidade com a LGPD, o usuário administrador tem total direito à edição, exclusão e portabilidade dos seus dados armazenados no banco de dados.",
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen w-full bg-[#020617] px-4 py-10 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[#1E293B] bg-[#0B1120]/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8 border-b border-[#1E293B] pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400/80">
            Multicell System
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Documento público para publicação do aplicativo e transparência no
            tratamento de dados.
          </p>
        </div>

        <div className="space-y-6">
          {privacySections.map((section) => (
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
            href="/termos"
            className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-amber-400/40 hover:text-white"
          >
            Ver Termos de Uso
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
