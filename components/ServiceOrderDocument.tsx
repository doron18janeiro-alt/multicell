import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CarFront,
  CalendarClock,
  CreditCard,
  Fuel,
  Gauge,
  Package,
  ShieldCheck,
  Smartphone,
  User,
  Wrench,
} from "lucide-react";
import { DocumentBrandHeader } from "@/components/DocumentBrandHeader";

export type DocumentCompanyConfig = {
  name: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

export type ServiceOrderDocumentData = {
  id?: number | string;
  osNumber?: number;
  status?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientCpf?: string | null;
  deviceModel?: string | null;
  deviceBrand?: string | null;
  serialNumber?: string | null;
  imei?: string | null;
  devicePassword?: string | null;
  deviceColor?: string | null;
  problem?: string | null;
  observations?: string | null;
  checklist?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  totalPrice?: number | null;
  costPrice?: number | null;
  servicePrice?: number | null;
  paymentMethod?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
};

type SectionCardProps = {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

type InfoFieldProps = {
  label: string;
  value: ReactNode;
};

const WARRANTY_DOCUMENT_STATUSES = new Set(["FINALIZADO", "ENTREGUE"]);

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const normalizeDate = (value?: string | Date) => {
  const parsedDate = value ? new Date(value) : new Date();
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

export const formatDocumentDate = (value?: string | Date) =>
  normalizeDate(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

const normalizeText = (value?: string | null, fallback = "Não informado") => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
};

export const isWarrantyDocumentStatus = (status?: string | null) =>
  WARRANTY_DOCUMENT_STATUSES.has(String(status || "").toUpperCase());

export const resolveDocumentReferenceDate = (
  data: Pick<ServiceOrderDocumentData, "status" | "createdAt" | "updatedAt">,
) =>
  isWarrantyDocumentStatus(data.status)
    ? normalizeDate(data.updatedAt || data.createdAt)
    : normalizeDate(data.createdAt);

export const resolveWarrantyExpirationDate = (
  data: Pick<ServiceOrderDocumentData, "status" | "createdAt" | "updatedAt">,
  warrantyDays = 90,
) => {
  const baseDate = resolveDocumentReferenceDate(data);
  const expirationDate = new Date(baseDate);
  expirationDate.setDate(expirationDate.getDate() + warrantyDays);
  return expirationDate;
};

export const resolveServiceDocumentTitle = (
  data: Pick<ServiceOrderDocumentData, "status" | "id" | "osNumber">,
) =>
  `${
    isWarrantyDocumentStatus(data.status)
      ? "TERMO DE GARANTIA DE SERVIÇO"
      : "ORDEM DE SERVIÇO"
  } #${data.id || data.osNumber || "-"}`;

const formatStatus = (status?: string | null) =>
  normalizeText(status?.replace(/_/g, " "), "Em aberto");

const getPaymentLabel = (paymentMethod?: string | null) => {
  const normalizedMethod = String(paymentMethod || "").toUpperCase();

  if (normalizedMethod === "DINHEIRO") {
    return "Dinheiro";
  }

  if (normalizedMethod === "PIX") {
    return "Pix";
  }

  if (normalizedMethod === "DEBITO") {
    return "Cartão Débito";
  }

  if (normalizedMethod === "CREDITO") {
    return "Cartão Crédito";
  }

  if (normalizedMethod === "CARTAO") {
    return "Cartão";
  }

  return normalizeText(paymentMethod, "A definir");
};

const LEGAL_NOTICE = {
  intakeHighlightTitle: "LGPD e Atendimento Técnico",
  intakeHighlightText:
    "O cliente autoriza o tratamento de dados para fins de gestão e a realização de testes técnicos que podem expor dados do aparelho.",
  intakeClauses: [
    "O cliente autoriza o tratamento de dados para fins de gestão, contato, histórico da assistência e execução dos testes técnicos necessários para diagnóstico e reparo do aparelho.",
    "Durante a análise e os testes de funcionamento, imagens, aplicativos, mensagens ou arquivos podem ser expostos incidentalmente. Recomenda-se backup prévio antes da entrega do equipamento.",
    "Aparelhos não retirados em até 90 dias após a notificação de prontidão serão considerados abandonados e poderão ser vendidos para custear despesas de peças, mão de obra e armazenamento, nos termos do art. 652 do Código Civil e art. 35 do CDC.",
  ],
  warrantyHighlightTitle: "Garantia de 90 Dias",
  warrantyHighlightText:
    "Garantia de 90 dias (Art. 26 CDC) sobre o serviço executado. A garantia não cobre mau uso, quedas, contato com líquidos ou lacre rompido.",
  warrantyClauses: [
    "Garantia de 90 dias (Art. 26 CDC) sobre o serviço executado, contada da data de entrega do aparelho ao cliente.",
    "A cobertura não se aplica a danos causados por mau uso, quedas, oxidação, contato com líquidos, violação de lacres ou intervenção de terceiros após a entrega.",
    "Para análise de garantia, este documento deve acompanhar o aparelho e o atendimento será vinculado ao responsável registrado nesta emissão.",
  ],
} as const;

const AUTO_LEGAL_NOTICE = {
  intakeHighlightTitle: "Recepção Automotiva",
  intakeHighlightText:
    "O cliente autoriza o registro técnico do veículo, das condições visuais de entrada e dos dados necessários para atendimento e orçamento.",
  intakeClauses: [
    "O cliente autoriza o tratamento de dados para fins de gestão, contato, histórico de atendimento e execução dos testes mecânicos, elétricos e eletrônicos necessários ao diagnóstico do veículo.",
    "O check-in registra nível de combustível, quilometragem, avarias aparentes e acessórios embarcados informados no ato da recepção.",
    "Veículos não retirados em até 90 dias após a notificação de prontidão poderão gerar cobrança de estadia, armazenamento e demais despesas operacionais, conforme legislação aplicável.",
  ],
  warrantyHighlightTitle: "Garantia de Serviço",
  warrantyHighlightText:
    "Garantia legal sobre o serviço executado, sem cobertura para mau uso, acidentes, colisões ou intervenções de terceiros após a entrega.",
  warrantyClauses: [
    "A garantia cobre exclusivamente o serviço executado e as peças efetivamente aplicadas na ordem de serviço.",
    "A cobertura não se aplica a danos causados por mau uso, colisões, sobrecarga, combustível inadequado, desgaste natural ou intervenção de terceiros após a entrega.",
    "Para análise de garantia, este documento deve acompanhar o veículo e o atendimento será vinculado ao responsável registrado nesta emissão.",
  ],
} as const;

function SectionCard({
  title,
  icon: Icon,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section
      className={`document-section rounded-[24px] border border-slate-200 bg-white p-5 ${className}`}
    >
      <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="rounded-full bg-[#FFF7CC] p-2 text-[#B45309]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Seção
          </p>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoField({ label, value }: InfoFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

export function ServiceOrderDocument({
  data,
  config,
  className = "",
  responsibleName,
}: {
  data: ServiceOrderDocumentData;
  config: DocumentCompanyConfig;
  className?: string;
  responsibleName?: string | null;
}) {
  const isWarrantyMode = isWarrantyDocumentStatus(data.status);
  const referenceDate = resolveDocumentReferenceDate(data);
  const warrantyExpirationDate = resolveWarrantyExpirationDate(data);
  const totalAmount = Number(data.totalPrice || 0);
  const partsAmount = Number(data.costPrice || 0);
  const serviceAmount =
    typeof data.servicePrice === "number"
      ? Number(data.servicePrice)
      : Math.max(totalAmount - partsAmount, 0);
  const hasBudget = totalAmount > 0 || partsAmount > 0 || serviceAmount > 0;
  const resolvedResponsibleName = normalizeText(
    responsibleName,
    "Responsavel nao informado",
  );
  const autoChecklist = data.checklist?.auto;
  const autoSnapshot = autoChecklist?.vehicleSnapshot || {};
  const isVehicleOrder = Boolean(
    autoChecklist?.plate ||
      autoSnapshot?.plate ||
      autoSnapshot?.chassis,
  );
  const trackedAssetLabel = isVehicleOrder ? "Veículo" : "Aparelho";
  const activeLegalNotice = isVehicleOrder ? AUTO_LEGAL_NOTICE : LEGAL_NOTICE;
  const clientAddress = data.customer?.address || null;
  const clientFields = [
    {
      label: "Nome",
      value: normalizeText(data.clientName, "Cliente não informado"),
    },
    data.clientPhone
      ? {
          label: "Telefone",
          value: data.clientPhone,
        }
      : null,
    data.clientCpf
      ? {
          label: "CPF / CNPJ",
          value: data.clientCpf,
        }
      : null,
    clientAddress
      ? {
          label: "Endereço",
          value: clientAddress,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: ReactNode }>;
  const deviceFields = [
    {
      label: "Marca / Modelo",
      value: normalizeText(
        `${data.deviceBrand || autoSnapshot?.brand || ""} ${data.deviceModel || autoSnapshot?.model || ""}`.trim(),
        `${trackedAssetLabel} não informado`,
      ),
    },
    isVehicleOrder
      ? {
          label: "Placa",
          value: normalizeText(
            autoChecklist?.plate || autoSnapshot?.plate || data.serialNumber,
          ),
        }
      : {
          label: "IMEI / Serial",
          value: normalizeText(data.serialNumber || data.imei),
        },
    isVehicleOrder
      ? {
          label: "Cor",
          value: normalizeText(
            autoChecklist?.color || data.deviceColor,
            "Não informada",
          ),
        }
      : null,
    isVehicleOrder
      ? {
          label: "Combustível",
          value: normalizeText(autoSnapshot?.fuel, "Não informado"),
        }
      : !isWarrantyMode
        ? {
            label: "Senha",
            value: normalizeText(data.devicePassword, "Sem senha"),
          }
        : null,
    isVehicleOrder
      ? {
          label: "KM Atual",
          value: normalizeText(autoChecklist?.mileage, "Não informado"),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: ReactNode }>;
  const checklistItems = isVehicleOrder
    ? [
        {
          label: "Combustível",
          value: autoChecklist?.fuelLevel,
        },
        {
          label: "KM Atual",
          value: autoChecklist?.mileage,
        },
        {
          label: "Avarias",
          value: autoChecklist?.externalDamage,
        },
      ].filter((item) => Boolean(item.value))
    : [
        {
          label: "Liga",
          value: data.checklist?.tests?.liga,
        },
        {
          label: "Tela / Touch",
          value: data.checklist?.tests?.touch,
        },
        {
          label: "Carcaça",
          value: data.checklist?.physical?.carcacaStatus,
        },
      ].filter((item) => Boolean(item.value));

  return (
    <article
      className={`document-paper rounded-[32px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8 ${className}`}
    >
      <DocumentBrandHeader
        companyName={config.name}
        cnpj={config.cnpj}
        document={config.document}
        address={config.address}
        phone={config.phone}
        logoUrl={config.logoUrl}
        title={resolveServiceDocumentTitle(data)}
        subtitle={
          isWarrantyMode
            ? `Garantia emitida em ${formatDocumentDate(referenceDate)}`
            : `Entrada em ${formatDocumentDate(referenceDate)}`
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="document-summary-card rounded-[22px] border border-[#FACC15] bg-[#FFFDE7] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B45309]">
            {isWarrantyMode ? "Garantia válida até" : "Status Atual"}
          </p>
          <p className="mt-2 text-xl font-bold uppercase tracking-[0.04em] text-slate-950">
            {isWarrantyMode
              ? formatDocumentDate(warrantyExpirationDate)
              : formatStatus(data.status)}
          </p>
          {isWarrantyMode ? (
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Cobertura legal de 90 dias sobre peças e mão de obra.
            </p>
          ) : null}
        </div>

        <div className="document-summary-card rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[#D97706]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {isWarrantyMode ? "Data da entrega" : "Data de entrada"}
            </p>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatDocumentDate(referenceDate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Status: {formatStatus(data.status)}
          </p>
        </div>

        <div className="document-summary-card rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D97706]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Vendedor / Responsável
            </p>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {resolvedResponsibleName}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Forma de pagamento: {getPaymentLabel(data.paymentMethod)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SectionCard title="Dados do Cliente" icon={User}>
          <div className="grid gap-4 sm:grid-cols-2">
            {clientFields.map((field) => (
              <InfoField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={isVehicleOrder ? "Detalhes do Veículo" : "Detalhes do Equipamento"}
          icon={isVehicleOrder ? CarFront : Smartphone}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {deviceFields.map((field) => (
              <InfoField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}
          </div>

          {checklistItems.length > 0 && !isWarrantyMode ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {isVehicleOrder ? "Check-in do veículo" : "Check-in do aparelho"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {checklistItems.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {item.label}: {String(item.value)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1.25fr]">
        <SectionCard title="Relato do Cliente" icon={AlertTriangle}>
          <p className="text-sm leading-6 text-slate-700">
            {normalizeText(
              data.problem,
              "Relato não registrado no momento da abertura.",
            )}
          </p>
        </SectionCard>

        <SectionCard
          title={isWarrantyMode ? "Serviço Realizado" : "Laudo Técnico"}
          icon={Wrench}
        >
          <p className="text-sm leading-6 text-slate-700">
            {normalizeText(
              data.observations,
              isWarrantyMode
                ? "Serviço concluído sem laudo complementar registrado."
                : `Laudo técnico pendente. O diagnóstico detalhado será anexado após a análise do ${isVehicleOrder ? "veículo" : "equipamento"}.`,
            )}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Peças Utilizadas" icon={Package} className="mt-4">
        <div className="rounded-[18px] border border-[#FDE68A] bg-[#FFFDF0] px-4 py-3 text-sm leading-6 text-slate-700">
          {partsAmount > 0 ? (
            <>
              Peças, componentes e insumos vinculados a esta ordem somam{" "}
              <span className="font-semibold text-slate-950">
                {formatCurrency(partsAmount)}
              </span>
              .
            </>
          ) : (
            "Nenhuma peça foi lançada até o momento. O preenchimento definitivo depende do diagnóstico e da aprovação do orçamento."
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
            Descrição da peça / componente
          </div>
          <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
            Código, lote ou observação de instalação
          </div>
        </div>
      </SectionCard>

      <section className="document-section mt-4 rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Serviços e Peças
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Composição financeira
          </h2>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                <th className="px-4 py-3 text-left font-semibold">Detalhe</th>
                <th className="px-4 py-3 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">
                  Serviço Técnico
                </td>
                <td className="px-4 py-3 text-slate-600">
                  Diagnóstico, mão de obra e execução do reparo.
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {serviceAmount > 0 || hasBudget
                    ? formatCurrency(serviceAmount)
                    : "A definir"}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-900">
                  Peças e Componentes
                </td>
                <td className="px-4 py-3 text-slate-600">
                  Itens lançados no custo técnico da O.S.
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {partsAmount > 0 || hasBudget
                    ? formatCurrency(partsAmount)
                    : "A definir"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="document-total mt-4 rounded-[24px] border border-[#FACC15] bg-[#FFFDE7] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B45309]">
          Total a Pagar
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl text-sm leading-6 text-slate-700">
            Valor final desta ordem de serviço, considerando mão de obra,
            peças, componentes e demais itens aprovados pelo cliente.
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tracking-[0.04em] text-slate-950 sm:text-4xl">
              {hasBudget ? formatCurrency(totalAmount) : "A definir"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[#FACC15] bg-[#FFFDE7] px-5 py-4 text-sm leading-6 text-slate-800">
        <p className="font-semibold uppercase tracking-[0.18em] text-[#B45309]">
          {isWarrantyMode
            ? activeLegalNotice.warrantyHighlightTitle
            : activeLegalNotice.intakeHighlightTitle}
        </p>
        <p className="mt-2">
          {isWarrantyMode
            ? activeLegalNotice.warrantyHighlightText
            : activeLegalNotice.intakeHighlightText}
        </p>
      </div>

      <section className="mt-6 border-t border-dashed border-slate-300 pt-4 text-[11px] leading-5 text-slate-600">
        <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">
          Cláusulas Jurídicas
        </p>
        <div className="mt-3 space-y-2">
          {(isWarrantyMode
            ? activeLegalNotice.warrantyClauses
            : activeLegalNotice.intakeClauses
          ).map((clause) => (
            <p key={clause}>{clause}</p>
          ))}
          <p>Vendedor/Responsável: {resolvedResponsibleName}.</p>
        </div>
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="pt-8 text-center">
          <div className="border-b border-slate-900" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            Assinatura do Responsável
          </p>
        </div>

        <div className="pt-8 text-center">
          <div className="border-b border-slate-900" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            Assinatura do Cliente
          </p>
        </div>
      </div>
    </article>
  );
}
