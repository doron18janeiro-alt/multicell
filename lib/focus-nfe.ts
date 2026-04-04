import { Prisma } from "@prisma/client";
import { NFE_EMISSION_COST } from "@/lib/nfe-wallet";

const FOCUS_NFE_TOKEN = process.env.FOCUS_NFE_TOKEN || "";
const FOCUS_NFE_PRODUCTION_URL = "https://api.focusnfe.com.br";
const FOCUS_NFE_HOMOLOGATION_URL = "https://homologacao.focusnfe.com.br";
const DEFAULT_NCM = "00000000";
const DEFAULT_CFOP = "5102";
const DEFAULT_UNIT = "UN";

type JsonRecord = Record<string, unknown>;

export type FocusNfeCompany = {
  companyId: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  companyData?: JsonRecord | null;
};

export type FocusNfeCustomer = {
  id?: string | null;
  name: string | null;
  phone: string | null;
  document: string | null;
};

export type FocusNfeItem = {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  barcode?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  unit?: string | null;
  icmsOrigem?: string | null;
  icmsSituacaoTributaria?: string | null;
  pisSituacaoTributaria?: string | null;
  cofinsSituacaoTributaria?: string | null;
};

type FocusNfeSettings = {
  ambiente: "producao" | "homologacao";
  naturezaOperacao: string;
  inscricaoEstadualEmitente: string | null;
  logradouroEmitente: string | null;
  numeroEmitente: string | null;
  bairroEmitente: string | null;
  municipioEmitente: string | null;
  ufEmitente: string | null;
  cepEmitente: string | null;
  regimeTributarioEmitente: string | null;
  codigoNcmPadrao: string | null;
  cfopPadrao: string | null;
  unidadePadrao: string | null;
  icmsOrigemPadrao: string | null;
  icmsSituacaoTributariaPadrao: string | null;
  pisSituacaoTributariaPadrao: string | null;
  cofinsSituacaoTributariaPadrao: string | null;
  nomeCredenciadora: string | null;
};

export type FocusReceivedNfeSummary = {
  accessKey: string;
  status: string | null;
  manifestStatus: string | null;
  documentNumber: string | null;
  supplierName: string | null;
  xmlPath: string | null;
  danfePath: string | null;
  xmlAvailable: boolean;
  payload: unknown;
};

export class FocusNfeError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "FocusNfeError";
    this.code = options?.code || "FOCUS_NFE_ERROR";
    this.status = options?.status || 500;
    this.details = options?.details;
  }
}

const getObject = (value: unknown): JsonRecord | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return value as JsonRecord;
};

const getString = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const getDigits = (value: unknown) =>
  String(value ?? "")
    .replace(/\D+/g, "")
    .trim();

const toMoney = (value: number) => Number(value || 0).toFixed(2);

const toQuantity = (value: number) => Number(value || 0).toFixed(4);

const buildAuthHeader = (token: string) =>
  `Basic ${Buffer.from(`${token}:`).toString("base64")}`;

const getFocusSettings = (companyData: unknown): FocusNfeSettings => {
  const root = getObject(companyData);
  const focus = getObject(root?.focusNfe) || root;

  return {
    ambiente:
      getString(focus?.ambiente)?.toLowerCase() === "homologacao"
        ? "homologacao"
        : "producao",
    naturezaOperacao:
      getString(focus?.naturezaOperacao) || "VENDA AO CONSUMIDOR",
    inscricaoEstadualEmitente: getString(
      focus?.inscricaoEstadualEmitente || focus?.inscricaoEstadual,
    ),
    logradouroEmitente: getString(
      focus?.logradouroEmitente || focus?.logradouro,
    ),
    numeroEmitente: getString(focus?.numeroEmitente || focus?.numero),
    bairroEmitente: getString(focus?.bairroEmitente || focus?.bairro),
    municipioEmitente: getString(
      focus?.municipioEmitente || focus?.municipio,
    ),
    ufEmitente: getString(focus?.ufEmitente || focus?.uf),
    cepEmitente: getString(focus?.cepEmitente || focus?.cep),
    regimeTributarioEmitente: getString(
      focus?.regimeTributarioEmitente || focus?.regimeTributario,
    ),
    codigoNcmPadrao: getString(focus?.codigoNcmPadrao || focus?.ncmPadrao),
    cfopPadrao: getString(focus?.cfopPadrao),
    unidadePadrao: getString(focus?.unidadePadrao),
    icmsOrigemPadrao: getString(focus?.icmsOrigemPadrao),
    icmsSituacaoTributariaPadrao: getString(
      focus?.icmsSituacaoTributariaPadrao || focus?.icmsCstPadrao,
    ),
    pisSituacaoTributariaPadrao: getString(
      focus?.pisSituacaoTributariaPadrao || focus?.pisCstPadrao,
    ),
    cofinsSituacaoTributariaPadrao: getString(
      focus?.cofinsSituacaoTributariaPadrao || focus?.cofinsCstPadrao,
    ),
    nomeCredenciadora: getString(focus?.nomeCredenciadora),
  };
};

const requireField = (value: string | null, label: string) => {
  if (!value) {
    throw new FocusNfeError(
      `Configure "${label}" nos dados fiscais da empresa antes de emitir notas pela Focus.`,
      {
        code: "FOCUS_NFE_CONFIG",
        status: 422,
      },
    );
  }

  return value;
};

const extractErrorMessage = (payload: unknown, fallback: string) => {
  const data = getObject(payload);
  const errorList = Array.isArray(data?.erros) ? data?.erros : [];
  const firstError =
    errorList.length > 0 && getObject(errorList[0])
      ? getObject(errorList[0])
      : null;

  return (
    getString(firstError?.mensagem) ||
    getString(data?.mensagem) ||
    getString(data?.message) ||
    fallback
  );
};

const safeParseJson = (value: string) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getFocusBaseUrl = (companyData: unknown) => {
  const settings = getFocusSettings(companyData);

  return settings.ambiente === "homologacao"
    ? FOCUS_NFE_HOMOLOGATION_URL
    : FOCUS_NFE_PRODUCTION_URL;
};

const ensureFocusReceivedNoteAccess = (certificateA1?: string | null) => {
  if (!FOCUS_NFE_TOKEN) {
    throw new FocusNfeError(
      "FOCUS_NFE_TOKEN nao configurado no ambiente. Defina a credencial antes de consultar notas recebidas.",
      {
        code: "FOCUS_NFE_TOKEN_MISSING",
        status: 503,
      },
    );
  }

  if (!getString(certificateA1)) {
    throw new FocusNfeError(
      "Cadastre o Certificado A1 da empresa antes de consultar XMLs de entrada pela Focus NFe.",
      {
        code: "FOCUS_NFE_CERTIFICATE_REQUIRED",
        status: 422,
      },
    );
  }
};

const resolvePaymentCode = (paymentMethod: string) => {
  switch (paymentMethod) {
    case "DINHEIRO":
      return "01";
    case "PIX":
      return "17";
    case "DEBITO":
      return "04";
    case "CREDITO":
      return "03";
    default:
      return "99";
  }
};

const buildRecipientPayload = (customer?: FocusNfeCustomer | null) => {
  if (!customer) {
    return {};
  }

  const documentDigits = getDigits(customer.document);

  if (documentDigits.length === 14) {
    throw new FocusNfeError(
      "Desde 3 de novembro de 2025, a NFC-e nao pode ser emitida para clientes com CNPJ. Use NF-e para pessoa juridica.",
      {
        code: "FOCUS_NFE_DOCUMENT_RULE",
        status: 422,
      },
    );
  }

  if (documentDigits.length !== 11) {
    return {};
  }

  return {
    nome_destinatario: customer.name || undefined,
    cpf_destinatario: documentDigits,
    telefone_destinatario: getDigits(customer.phone) || undefined,
    indicador_inscricao_estadual_destinatario: "9",
  };
};

const buildItemsPayload = (
  items: FocusNfeItem[],
  settings: FocusNfeSettings,
) =>
  items.map((item, index) => ({
    numero_item: String(index + 1),
    codigo_ncm:
      getDigits(item.ncm || settings.codigoNcmPadrao || DEFAULT_NCM).slice(0, 8) ||
      DEFAULT_NCM,
    codigo_produto: item.barcode || item.productId,
    descricao: item.description,
    quantidade_comercial: toQuantity(item.quantity),
    quantidade_tributavel: toQuantity(item.quantity),
    cfop: getString(item.cfop || settings.cfopPadrao || DEFAULT_CFOP) || DEFAULT_CFOP,
    valor_unitario_comercial: toMoney(item.unitPrice),
    valor_unitario_tributavel: toMoney(item.unitPrice),
    valor_bruto: toMoney(item.quantity * item.unitPrice),
    unidade_comercial:
      getString(item.unit || settings.unidadePadrao || DEFAULT_UNIT) || DEFAULT_UNIT,
    unidade_tributavel:
      getString(item.unit || settings.unidadePadrao || DEFAULT_UNIT) || DEFAULT_UNIT,
    icms_origem:
      getString(item.icmsOrigem || settings.icmsOrigemPadrao || "0") || "0",
    icms_situacao_tributaria:
      getString(
        item.icmsSituacaoTributaria ||
          settings.icmsSituacaoTributariaPadrao ||
          "102",
      ) || "102",
    pis_situacao_tributaria:
      getString(
        item.pisSituacaoTributaria ||
          settings.pisSituacaoTributariaPadrao ||
          "49",
      ) || "49",
    cofins_situacao_tributaria:
      getString(
        item.cofinsSituacaoTributaria ||
          settings.cofinsSituacaoTributariaPadrao ||
          "49",
      ) || "49",
    valor_desconto: "0.00",
  }));

export async function emitirNota(input: {
  reference: string;
  company: FocusNfeCompany;
  customer?: FocusNfeCustomer | null;
  items: FocusNfeItem[];
  paymentMethod: string;
  total: number;
}) {
  if (!FOCUS_NFE_TOKEN) {
    throw new FocusNfeError(
      "FOCUS_NFE_TOKEN nao configurado no ambiente. Defina a credencial antes de emitir notas.",
      {
        code: "FOCUS_NFE_TOKEN_MISSING",
        status: 503,
      },
    );
  }

  const settings = getFocusSettings(input.company.companyData);
  const cnpjEmitente = requireField(
    getDigits(input.company.cnpj),
    "CNPJ da empresa",
  );
  const logradouroEmitente = requireField(
    getString(settings.logradouroEmitente || input.company.address),
    "logradouroEmitente",
  );
  const numeroEmitente = requireField(
    getString(settings.numeroEmitente),
    "numeroEmitente",
  );
  const bairroEmitente = requireField(
    getString(settings.bairroEmitente),
    "bairroEmitente",
  );
  const municipioEmitente = requireField(
    getString(settings.municipioEmitente),
    "municipioEmitente",
  );
  const ufEmitente = requireField(
    getString(settings.ufEmitente),
    "ufEmitente",
  );
  const regimeTributarioEmitente = requireField(
    getString(settings.regimeTributarioEmitente),
    "regimeTributarioEmitente",
  );
  const inscricaoEstadualEmitente = requireField(
    getString(settings.inscricaoEstadualEmitente),
    "inscricaoEstadualEmitente",
  );
  const recipient = buildRecipientPayload(input.customer);
  const items = buildItemsPayload(input.items, settings);
  const paymentCode = resolvePaymentCode(input.paymentMethod);
  const baseUrl =
    settings.ambiente === "homologacao"
      ? FOCUS_NFE_HOMOLOGATION_URL
      : FOCUS_NFE_PRODUCTION_URL;

  const paymentPayload: Record<string, string> = {
    forma_pagamento: paymentCode,
    valor_pagamento: toMoney(input.total),
  };

  if ((paymentCode === "03" || paymentCode === "04") && settings.nomeCredenciadora) {
    paymentPayload.nome_credenciadora = settings.nomeCredenciadora;
  }

  const body = {
    cnpj_emitente: cnpjEmitente,
    data_emissao: new Date().toISOString(),
    natureza_operacao: settings.naturezaOperacao,
    inscricao_estadual_emitente: inscricaoEstadualEmitente,
    logradouro_emitente: logradouroEmitente,
    numero_emitente: numeroEmitente,
    bairro_emitente: bairroEmitente,
    municipio_emitente: municipioEmitente,
    uf_emitente: ufEmitente,
    cep_emitente: getDigits(settings.cepEmitente) || undefined,
    regime_tributario_emitente: regimeTributarioEmitente,
    modalidade_frete: "9",
    local_destino: "1",
    presenca_comprador: "1",
    items,
    formas_pagamento: [paymentPayload],
    ...recipient,
  };

  const response = await fetch(
    `${baseUrl}/v2/nfce?ref=${encodeURIComponent(input.reference)}&completa=1`,
    {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(FOCUS_NFE_TOKEN),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const responseText = await response.text();
  const payload = safeParseJson(responseText);

  if (!response.ok) {
    throw new FocusNfeError(
      extractErrorMessage(payload, "Nao foi possivel emitir a NFC-e na Focus."),
      {
        code: "FOCUS_NFE_REQUEST_FAILED",
        status: response.status,
        details: payload,
      },
    );
  }

  const status = getString(getObject(payload)?.status)?.toLowerCase() || "autorizado";

  if (status.startsWith("erro")) {
    throw new FocusNfeError(
      extractErrorMessage(payload, "A Focus rejeitou a emissao da NFC-e."),
      {
        code: "FOCUS_NFE_REJECTED",
        status: 422,
        details: payload,
      },
    );
  }

  return {
    reference: input.reference,
    status,
    documentNumber:
      getString(getObject(payload)?.numero) ||
      getString(getObject(payload)?.ref) ||
      `NFCe ${input.reference}`,
    accessKey: getString(getObject(payload)?.chave_nfe),
    danfePath: getString(getObject(payload)?.caminho_danfe),
    xmlPath: getString(getObject(payload)?.caminho_xml_nota_fiscal),
    payload,
  };
}

export async function consultarNfeRecebidaPorChave(input: {
  accessKey: string;
  companyData?: unknown;
  certificateA1?: string | null;
}) {
  ensureFocusReceivedNoteAccess(input.certificateA1);

  const response = await fetch(
    `${getFocusBaseUrl(input.companyData)}/v2/nfes_recebidas/${encodeURIComponent(input.accessKey)}`,
    {
      method: "GET",
      headers: {
        Authorization: buildAuthHeader(FOCUS_NFE_TOKEN),
      },
      cache: "no-store",
    },
  );

  const responseText = await response.text();
  const payload = safeParseJson(responseText);

  if (!response.ok) {
    throw new FocusNfeError(
      extractErrorMessage(
        payload,
        "Nao foi possivel consultar a NF-e recebida na Focus.",
      ),
      {
        code: "FOCUS_RECEIVED_NFE_LOOKUP_FAILED",
        status: response.status,
        details: payload,
      },
    );
  }

  const data = getObject(payload) || {};

  return {
    accessKey: input.accessKey,
    status: getString(data.status),
    manifestStatus: getString(
      data.situacao_manifestacao ||
        data.ultima_manifestacao ||
        data.manifestacao,
    ),
    documentNumber: getString(data.numero),
    supplierName: getString(data.nome_emitente || data.razao_social_emitente),
    xmlPath: getString(data.caminho_xml_nota_fiscal || data.caminho_xml),
    danfePath: getString(data.caminho_danfe),
    xmlAvailable: Boolean(
      getString(data.caminho_xml_nota_fiscal || data.caminho_xml),
    ),
    payload,
  } satisfies FocusReceivedNfeSummary;
}

export async function baixarXmlNfeRecebidaPorChave(input: {
  accessKey: string;
  companyData?: unknown;
  certificateA1?: string | null;
}) {
  ensureFocusReceivedNoteAccess(input.certificateA1);

  const response = await fetch(
    `${getFocusBaseUrl(input.companyData)}/v2/nfes_recebidas/${encodeURIComponent(input.accessKey)}.xml`,
    {
      method: "GET",
      headers: {
        Authorization: buildAuthHeader(FOCUS_NFE_TOKEN),
      },
      cache: "no-store",
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    const payload = safeParseJson(responseText);

    throw new FocusNfeError(
      extractErrorMessage(
        payload,
        "Nao foi possivel baixar o XML da NF-e recebida na Focus.",
      ),
      {
        code: "FOCUS_RECEIVED_NFE_XML_FAILED",
        status: response.status,
        details: payload ?? responseText,
      },
    );
  }

  if (!responseText.includes("<")) {
    throw new FocusNfeError(
      "A Focus retornou uma resposta invalida ao baixar o XML da nota recebida.",
      {
        code: "FOCUS_RECEIVED_NFE_XML_INVALID",
        status: 502,
        details: responseText,
      },
    );
  }

  return responseText;
}

export async function registerSuccessfulNfeEmission(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    saleId: number;
    documentNumber: string;
    amount?: number;
  },
) {
  const amount = Number(input.amount ?? NFE_EMISSION_COST);

  const updated = await tx.company.updateMany({
    where: {
      id: input.companyId,
      nfeBalance: {
        gte: amount,
      },
    },
    data: {
      nfeBalance: {
        decrement: amount,
      },
    },
  });

  if (!updated.count) {
    throw new FocusNfeError(
      "Saldo insuficiente para emitir nota. Recarregue agora.",
      {
        code: "NFE_BALANCE_LOW",
        status: 402,
      },
    );
  }

  await tx.nfeLog.create({
    data: {
      companyId: input.companyId,
      saleId: input.saleId,
      documentNumber: input.documentNumber,
      amount,
    },
  });

  const company = await tx.company.findUnique({
    where: { id: input.companyId },
    select: { nfeBalance: true },
  });

  return Number(company?.nfeBalance || 0);
}
