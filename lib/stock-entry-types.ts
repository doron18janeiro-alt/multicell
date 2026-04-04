import type { BusinessSegment } from "@/lib/segment-specialization";

export type StockEntryImportMethod = "XML_UPLOAD" | "ACCESS_KEY" | "DANFE_SCAN";

export type StockEntryProcessAction =
  | "CREATE_NEW"
  | "UPDATE_EXISTING"
  | "IGNORED";

export type StockEntryInstallment = {
  id: string;
  number: string | null;
  dueDate: string | null;
  amount: number;
};

export type StockEntryVehicleSnapshot = {
  chassis?: string | null;
  engine?: string | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  color?: string | null;
};

export type StockEntryParsedItem = {
  id: string;
  description: string;
  internalCode: string | null;
  barcode: string | null;
  ncm: string | null;
  cfop: string | null;
  unit: string | null;
  quantity: number;
  stockQuantity: number;
  unitCost: number;
  totalCost: number;
  additionalInfo: string | null;
  suggestedCategory: string;
  isVehicle: boolean;
  vehicle: StockEntryVehicleSnapshot | null;
};

export type StockEntryMatchedProduct = {
  id: string;
  name: string;
  barcode: string | null;
  ncm: string | null;
  category: string;
  stock: number;
  costPrice: number;
  salePrice: number;
};

export type StockEntryPreviewItem = StockEntryParsedItem & {
  existingProduct: StockEntryMatchedProduct | null;
  suggestedAction: StockEntryProcessAction;
  projectedAverageCost: number | null;
  projectedStock: number | null;
  autoCreateLabel: string;
  segmentHint: string | null;
};

export type StockEntryPreview = {
  sourceMethod: StockEntryImportMethod;
  sourceLabel: string;
  xmlSource: "upload" | "focus";
  segment: BusinessSegment | null;
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
  items: StockEntryPreviewItem[];
  rawSummary?: {
    status?: string | null;
    manifestStatus?: string | null;
    xmlAvailable?: boolean;
  };
};

export type StockEntryProcessItemInput = {
  id: string;
  action: StockEntryProcessAction;
  existingProductId: string | null;
  name: string;
  barcode: string;
  ncm: string;
  category: string;
  costPrice: string;
  salePrice: string;
};

