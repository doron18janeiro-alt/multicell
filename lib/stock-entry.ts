import "server-only";

import { XMLParser } from "fast-xml-parser";
import type { BusinessSegment } from "@/lib/segment-specialization";
import {
  getDefaultProductCategory,
  getProductCategoryLabel,
} from "@/lib/segment-specialization";
import type {
  StockEntryInstallment,
  StockEntryMatchedProduct,
  StockEntryParsedItem,
  StockEntryPreview,
  StockEntryPreviewItem,
  StockEntryProcessAction,
  StockEntryImportMethod,
} from "@/lib/stock-entry-types";

type JsonRecord = Record<string, unknown>;

const xmlParser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
});

const VEHICLE_NCM_PREFIXES = ["8702", "8703", "8704"];
const AUTO_PART_NCM_PREFIXES = ["8407", "8408", "8483", "8511", "8708"];
const TIRE_NCM_PREFIXES = ["4011", "4012"];
const LUBRICANT_NCM_PREFIXES = ["2710", "3403"];

const FOOD_BEVERAGE_KEYWORDS = [
  "agua",
  "suco",
  "refrigerante",
  "cerveja",
  "vinho",
  "chope",
  "energetico",
];
const FOOD_INPUT_KEYWORDS = [
  "farinha",
  "carne",
  "frango",
  "queijo",
  "molho",
  "arroz",
  "feijao",
  "oleo",
  "fermento",
  "insumo",
  "acucar",
  "sal",
];
const FOOD_DESSERT_KEYWORDS = [
  "sobremesa",
  "sorvete",
  "pudim",
  "brownie",
  "mousse",
  "chocolate",
];
const TECH_SMARTPHONE_KEYWORDS = [
  "smartphone",
  "iphone",
  "celular",
  "motorola",
  "xiaomi",
  "galaxy",
];
const TECH_NOTEBOOK_KEYWORDS = [
  "notebook",
  "laptop",
  "macbook",
  "ultrabook",
];
const TECH_PARTS_KEYWORDS = [
  "tela",
  "bateria",
  "placa",
  "conector",
  "flex",
  "carcaca",
  "display",
];
const TECH_PERIPHERAL_KEYWORDS = [
  "mouse",
  "teclado",
  "fone",
  "monitor",
  "webcam",
  "controle",
];
const RETAIL_PACKAGING_KEYWORDS = ["embalagem", "sacola", "caixa", "saco"];
const RETAIL_ACCESSORY_KEYWORDS = ["acessorio", "brinde", "suporte"];
const AUTO_ACCESSORY_KEYWORDS = [
  "tapete",
  "sensor",
  "camera",
  "multimidia",
  "acessorio",
];
const AUTO_LUBRICANT_KEYWORDS = [
  "oleo",
  "lubrificante",
  "fluido",
  "aditivo",
  "coolant",
];
const AUTO_PART_KEYWORDS = [
  "pastilha",
  "filtro",
  "amortecedor",
  "embreagem",
  "bateria",
  "correia",
  "vela",
  "peca",
];
const AUTO_TIRE_KEYWORDS = ["pneu", "camara de ar"];

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [value];
};

const getRecord = (value: unknown): JsonRecord | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return value as JsonRecord;
};

const getText = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const getDigits = (value: unknown) =>
  String(value ?? "")
    .replace(/\D+/g, "")
    .trim();

const parseNumber = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBarcode = (value: unknown) => {
  const normalized = getText(value)?.toUpperCase() || "";

  if (!normalized || normalized === "SEM GTIN" || normalized === "SEMGTIN") {
    return null;
  }

  return normalized;
};

const normalizeNcm = (value: unknown) => {
  const digits = getDigits(value);
  return digits || null;
};

const normalizeDate = (value: unknown) => {
  const raw = getText(value);

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const includesAnyKeyword = (value: string, keywords: string[]) => {
  const normalizedValue = normalizeLabel(value);
  return keywords.some((keyword) => normalizedValue.includes(keyword));
};

const matchesNcmPrefix = (ncm: string | null, prefixes: string[]) =>
  Boolean(
    ncm &&
      prefixes.some((prefix) =>
        String(ncm || "").replace(/\D+/g, "").startsWith(prefix),
      ),
  );

const inferCategoryBySegment = (
  description: string,
  ncm: string | null,
  segment: BusinessSegment | null,
  isVehicle: boolean,
) => {
  if (segment === "AUTO") {
    if (isVehicle || matchesNcmPrefix(ncm, VEHICLE_NCM_PREFIXES)) {
      return "VEICULO";
    }

    if (
      matchesNcmPrefix(ncm, TIRE_NCM_PREFIXES) ||
      includesAnyKeyword(description, AUTO_TIRE_KEYWORDS)
    ) {
      return "PNEU";
    }

    if (
      matchesNcmPrefix(ncm, LUBRICANT_NCM_PREFIXES) ||
      includesAnyKeyword(description, AUTO_LUBRICANT_KEYWORDS)
    ) {
      return "LUBRIFICANTE";
    }

    if (
      matchesNcmPrefix(ncm, AUTO_PART_NCM_PREFIXES) ||
      includesAnyKeyword(description, AUTO_PART_KEYWORDS)
    ) {
      return "PECA_AUTOMOTIVA";
    }

    return includesAnyKeyword(description, AUTO_ACCESSORY_KEYWORDS)
      ? "ACESSORIO_AUTOMOTIVO"
      : "PECA_AUTOMOTIVA";
  }

  if (segment === "FOOD") {
    if (includesAnyKeyword(description, FOOD_BEVERAGE_KEYWORDS)) {
      return "BEBIDA";
    }

    if (includesAnyKeyword(description, FOOD_DESSERT_KEYWORDS)) {
      return "SOBREMESA";
    }

    if (includesAnyKeyword(description, FOOD_INPUT_KEYWORDS)) {
      return "INSUMO";
    }

    return "ALIMENTO";
  }

  if (segment === "TECH") {
    if (includesAnyKeyword(description, TECH_SMARTPHONE_KEYWORDS)) {
      return "SMARTPHONE";
    }

    if (includesAnyKeyword(description, TECH_NOTEBOOK_KEYWORDS)) {
      return "NOTEBOOK";
    }

    if (includesAnyKeyword(description, TECH_PARTS_KEYWORDS)) {
      return "PECA_REPOSICAO";
    }

    if (includesAnyKeyword(description, TECH_PERIPHERAL_KEYWORDS)) {
      return "PERIFERICO";
    }

    return getDefaultProductCategory(segment);
  }

  if (segment === "BEAUTY") {
    if (includesAnyKeyword(description, ["perfume", "fragrancia"])) {
      return "PERFUMARIA";
    }

    if (includesAnyKeyword(description, ["serum", "tratamento", "hidrata"])) {
      return "TRATAMENTO";
    }

    if (includesAnyKeyword(description, ["acessorio", "pincel"])) {
      return "ACESSORIO_BEAUTY";
    }

    return "COSMETICO";
  }

  if (segment === "RETAIL") {
    if (includesAnyKeyword(description, RETAIL_PACKAGING_KEYWORDS)) {
      return "EMBALAGEM";
    }

    if (includesAnyKeyword(description, RETAIL_ACCESSORY_KEYWORDS)) {
      return "ACESSORIO";
    }

    if (includesAnyKeyword(description, ["utilidade", "organiz"])) {
      return "UTILIDADE";
    }

    return "PRODUTO_GERAL";
  }

  return getDefaultProductCategory(segment);
};

const calculateAverageCost = (
  currentStock: number,
  currentCost: number,
  addedStock: number,
  addedCost: number,
) => {
  const normalizedCurrentStock = Math.max(Number(currentStock || 0), 0);
  const normalizedAddedStock = Math.max(Number(addedStock || 0), 0);
  const totalStock = normalizedCurrentStock + normalizedAddedStock;

  if (totalStock <= 0) {
    return Number(addedCost || 0);
  }

  return (
    (normalizedCurrentStock * Number(currentCost || 0) +
      normalizedAddedStock * Number(addedCost || 0)) /
    totalStock
  );
};

const resolveStockQuantity = (quantity: number, isVehicle: boolean) => {
  if (isVehicle) {
    return 1;
  }

  return Math.max(1, Math.ceil(Number(quantity || 0)));
};

const resolveSegmentHint = (segment: BusinessSegment | null, category: string) => {
  if (segment === "FOOD" && (category === "INSUMO" || category === "BEBIDA")) {
    return "Vai para o estoque de insumos do restaurante.";
  }

  if (segment === "AUTO" && category === "VEICULO") {
    return "Entrada veicular com ficha técnica parcial pela NF-e.";
  }

  return null;
};

const buildAutoCreateLabel = (category: string) =>
  `Criar em ${getProductCategoryLabel(category)}`;

const findExistingProduct = (
  item: StockEntryParsedItem,
  products: StockEntryMatchedProduct[],
) => {
  const normalizedBarcode = normalizeBarcode(item.barcode);

  if (normalizedBarcode) {
    const byBarcode = products.find(
      (product) => normalizeBarcode(product.barcode) === normalizedBarcode,
    );

    if (byBarcode) {
      return byBarcode;
    }
  }

  const normalizedDescription = normalizeLabel(item.description);

  return (
    products.find(
      (product) => normalizeLabel(product.name) === normalizedDescription,
    ) || null
  );
};

const roundMoney = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

type ParsedInvoice = {
  accessKey: string | null;
  invoiceNumber: string | null;
  series: string | null;
  supplierName: string | null;
  supplierDocument: string | null;
  issueDate: string | null;
  productsTotal: number;
  freightAmount: number;
  discountAmount: number;
  totalAmount: number;
  installments: StockEntryInstallment[];
  items: StockEntryParsedItem[];
};

export const parseNfeXmlDocument = (
  xmlContent: string,
  segment: BusinessSegment | null,
): ParsedInvoice => {
  const parsed = xmlParser.parse(xmlContent);
  const root = getRecord(parsed) || {};
  const nfeProc = getRecord(root.nfeProc) || root;
  const nfe = getRecord(nfeProc.NFe) || getRecord(root.NFe) || root;
  const infNFe = getRecord(nfe.infNFe) || getRecord(root.infNFe) || {};
  const ide = getRecord(infNFe.ide) || {};
  const emit = getRecord(infNFe.emit) || {};
  const total = getRecord(infNFe.total) || {};
  const icmsTot = getRecord(total.ICMSTot) || {};
  const cobr = getRecord(infNFe.cobr) || {};
  const infNFeId = getText(infNFe.Id);
  const prot = getRecord(getRecord(nfeProc.protNFe)?.infProt);

  const accessKey =
    getDigits(infNFeId?.replace(/^NFe/i, "")) ||
    getDigits(prot?.chNFe) ||
    null;

  const items = toArray(infNFe.det).map((detail, index) => {
    const det = getRecord(detail) || {};
    const prod = getRecord(det.prod) || {};
    const vehicleNode = getRecord(prod.veicProd);
    const description = getText(prod.xProd) || `Item ${index + 1}`;
    const isVehicle = Boolean(vehicleNode) || matchesNcmPrefix(normalizeNcm(prod.NCM), VEHICLE_NCM_PREFIXES);
    const quantity = parseNumber(prod.qCom || prod.qTrib || 0);
    const unitCost = parseNumber(prod.vUnCom || prod.vUnTrib || 0);
    const totalCost = parseNumber(prod.vProd || quantity * unitCost);
    const suggestedCategory = inferCategoryBySegment(
      description,
      normalizeNcm(prod.NCM),
      segment,
      isVehicle,
    );

    return {
      id: String(getText(det.nItem) || index + 1),
      description,
      internalCode: getText(prod.cProd),
      barcode: normalizeBarcode(prod.cEANTrib || prod.cEAN),
      ncm: normalizeNcm(prod.NCM),
      cfop: getText(prod.CFOP),
      unit: getText(prod.uCom || prod.uTrib),
      quantity,
      stockQuantity: resolveStockQuantity(quantity, isVehicle),
      unitCost,
      totalCost,
      additionalInfo: getText(prod.infAdProd),
      suggestedCategory,
      isVehicle,
      vehicle: isVehicle
        ? {
            chassis: getText(vehicleNode?.chassi),
            engine: getText(vehicleNode?.nMotor),
            manufactureYear: Number.parseInt(
              String(vehicleNode?.anoFab || ""),
              10,
            ) || null,
            modelYear:
              Number.parseInt(String(vehicleNode?.anoMod || ""), 10) || null,
            color: getText(vehicleNode?.xCor),
          }
        : null,
    };
  });

  const installments = toArray(cobr.dup).map((duplicate, index) => {
    const dup = getRecord(duplicate) || {};

    return {
      id: `${index + 1}`,
      number: getText(dup.nDup),
      dueDate: normalizeDate(dup.dVenc),
      amount: roundMoney(parseNumber(dup.vDup)),
    };
  });

  return {
    accessKey: accessKey || null,
    invoiceNumber: getText(ide.nNF),
    series: getText(ide.serie),
    supplierName: getText(emit.xNome),
    supplierDocument: getDigits(emit.CNPJ || emit.CPF) || null,
    issueDate: normalizeDate(ide.dhEmi || ide.dEmi),
    productsTotal: roundMoney(parseNumber(icmsTot.vProd)),
    freightAmount: roundMoney(parseNumber(icmsTot.vFrete)),
    discountAmount: roundMoney(parseNumber(icmsTot.vDesc)),
    totalAmount: roundMoney(parseNumber(icmsTot.vNF)),
    installments,
    items,
  };
};

export const buildStockEntryPreview = (input: {
  method: StockEntryImportMethod;
  xmlSource: "upload" | "focus";
  segment: BusinessSegment | null;
  invoice: ParsedInvoice;
  products: StockEntryMatchedProduct[];
  rawSummary?: StockEntryPreview["rawSummary"];
}): StockEntryPreview => {
  const previewItems: StockEntryPreviewItem[] = input.invoice.items.map((item) => {
    const existingProduct = findExistingProduct(item, input.products);
    const suggestedAction: StockEntryProcessAction = existingProduct
      ? "UPDATE_EXISTING"
      : "CREATE_NEW";
    const projectedAverageCost = existingProduct
      ? roundMoney(
          calculateAverageCost(
            existingProduct.stock,
            existingProduct.costPrice,
            item.stockQuantity,
            item.unitCost,
          ),
        )
      : null;
    const projectedStock = existingProduct
      ? existingProduct.stock + item.stockQuantity
      : item.stockQuantity;

    return {
      ...item,
      existingProduct,
      suggestedAction,
      projectedAverageCost,
      projectedStock,
      autoCreateLabel: buildAutoCreateLabel(item.suggestedCategory),
      segmentHint: resolveSegmentHint(input.segment, item.suggestedCategory),
    };
  });

  return {
    sourceMethod: input.method,
    sourceLabel:
      input.method === "XML_UPLOAD"
        ? "Importar XML"
        : input.method === "DANFE_SCAN"
          ? "Escanear DANFE"
          : "Digitar Chave de Acesso",
    xmlSource: input.xmlSource,
    segment: input.segment,
    accessKey: input.invoice.accessKey,
    invoiceNumber: input.invoice.invoiceNumber,
    series: input.invoice.series,
    supplierName: input.invoice.supplierName,
    supplierDocument: input.invoice.supplierDocument,
    issueDate: input.invoice.issueDate,
    productsTotal: input.invoice.productsTotal,
    freightAmount: input.invoice.freightAmount,
    discountAmount: input.invoice.discountAmount,
    totalAmount: input.invoice.totalAmount,
    installments: input.invoice.installments,
    items: previewItems,
    rawSummary: input.rawSummary,
  };
};
