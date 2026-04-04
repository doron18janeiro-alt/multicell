export type BusinessSegment = "TECH" | "RETAIL" | "AUTO" | "BEAUTY" | "FOOD";

export type ProductCategoryOption = {
  value: string;
  label: string;
  requiresVehicleProfile?: boolean;
};

export type VehicleFuelOption =
  | "FLEX"
  | "GASOLINA"
  | "ALCOOL"
  | "DIESEL"
  | "HIBRIDO"
  | "ELETRICO"
  | "HIBRIDO_PLUG_IN";

export type VehicleSteeringOption =
  | "HIDRAULICA"
  | "ELETRICA"
  | "MECANICA";

export type VehicleInventoryStatus =
  | "DISPONIVEL"
  | "MANUTENCAO"
  | "VENDIDO";

export type VehicleProfile = {
  brand?: string | null;
  model?: string | null;
  plate?: string | null;
  chassis?: string | null;
  renavam?: string | null;
  status?: VehicleInventoryStatus | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  engine?: string | null;
  color?: string | null;
  mileage?: number | null;
  fuel?: VehicleFuelOption | null;
  airConditioning?: boolean | null;
  airbag?: boolean | null;
  steering?: VehicleSteeringOption | null;
  powerWindows?: boolean | null;
  alarm?: boolean | null;
  multimedia?: boolean | null;
  additionalInfo?: string | null;
};

export const VEHICLE_CATEGORY = "VEICULO";

export const VEHICLE_FUEL_OPTIONS: Array<{
  value: VehicleFuelOption;
  label: string;
}> = [
  { value: "FLEX", label: "Flex" },
  { value: "GASOLINA", label: "Gasolina" },
  { value: "ALCOOL", label: "Álcool" },
  { value: "DIESEL", label: "Diesel" },
  { value: "HIBRIDO", label: "Híbrido" },
  { value: "ELETRICO", label: "Elétrico" },
  { value: "HIBRIDO_PLUG_IN", label: "Híbrido/Plug-in" },
];

export const VEHICLE_STEERING_OPTIONS: Array<{
  value: VehicleSteeringOption;
  label: string;
}> = [
  { value: "HIDRAULICA", label: "Hidráulica" },
  { value: "ELETRICA", label: "Elétrica" },
  { value: "MECANICA", label: "Mecânica" },
];

export const VEHICLE_STATUS_OPTIONS: Array<{
  value: VehicleInventoryStatus;
  label: string;
}> = [
  { value: "DISPONIVEL", label: "Disponível" },
  { value: "MANUTENCAO", label: "Em manutenção" },
  { value: "VENDIDO", label: "Vendido" },
];

const SEGMENT_PRODUCT_CATEGORIES: Record<
  BusinessSegment,
  ProductCategoryOption[]
> = {
  AUTO: [
    { value: VEHICLE_CATEGORY, label: "Veículos", requiresVehicleProfile: true },
    { value: "PECA_AUTOMOTIVA", label: "Peças" },
    { value: "LUBRIFICANTE", label: "Lubrificantes" },
    { value: "PNEU", label: "Pneus" },
    { value: "ACESSORIO_AUTOMOTIVO", label: "Acessórios Automotivos" },
  ],
  TECH: [
    { value: "SMARTPHONE", label: "Smartphones" },
    { value: "NOTEBOOK", label: "Notebooks" },
    { value: "PECA_REPOSICAO", label: "Peças de Reposição" },
    { value: "PERIFERICO", label: "Periféricos" },
  ],
  RETAIL: [
    { value: "PRODUTO_GERAL", label: "Produtos Gerais" },
    { value: "UTILIDADE", label: "Utilidades" },
    { value: "ACESSORIO", label: "Acessórios" },
    { value: "EMBALAGEM", label: "Embalagens" },
  ],
  FOOD: [
    { value: "ALIMENTO", label: "Alimentos" },
    { value: "BEBIDA", label: "Bebidas" },
    { value: "INSUMO", label: "Insumos" },
    { value: "SOBREMESA", label: "Sobremesas" },
  ],
  BEAUTY: [
    { value: "COSMETICO", label: "Cosméticos" },
    { value: "PERFUMARIA", label: "Perfumaria" },
    { value: "TRATAMENTO", label: "Tratamentos" },
    { value: "ACESSORIO_BEAUTY", label: "Acessórios Beauty" },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  PECA: "Peça",
  ACESSORIO: "Acessório",
  APARELHO: "Aparelho Telefônico",
  SMARTPHONE: "Smartphones",
  NOTEBOOK: "Notebooks",
  PECA_REPOSICAO: "Peças de Reposição",
  PERIFERICO: "Periféricos",
  PRODUTO_GERAL: "Produtos Gerais",
  UTILIDADE: "Utilidades",
  EMBALAGEM: "Embalagens",
  ALIMENTO: "Alimentos",
  BEBIDA: "Bebidas",
  INSUMO: "Insumos",
  SOBREMESA: "Sobremesas",
  COSMETICO: "Cosméticos",
  PERFUMARIA: "Perfumaria",
  TRATAMENTO: "Tratamentos",
  ACESSORIO_BEAUTY: "Acessórios Beauty",
  VEICULO: "Veículos",
  PECA_AUTOMOTIVA: "Peças",
  LUBRIFICANTE: "Lubrificantes",
  PNEU: "Pneus",
  ACESSORIO_AUTOMOTIVO: "Acessórios Automotivos",
};

export const normalizeBusinessSegment = (
  value: string | null | undefined,
): BusinessSegment | null => {
  if (
    value === "TECH" ||
    value === "RETAIL" ||
    value === "AUTO" ||
    value === "BEAUTY" ||
    value === "FOOD"
  ) {
    return value;
  }

  return null;
};

export const getSegmentProductCategories = (
  segment: string | null | undefined,
): ProductCategoryOption[] => {
  const normalizedSegment = normalizeBusinessSegment(segment);

  return normalizedSegment
    ? SEGMENT_PRODUCT_CATEGORIES[normalizedSegment]
    : SEGMENT_PRODUCT_CATEGORIES.TECH;
};

export const getDefaultProductCategory = (
  segment: string | null | undefined,
) => getSegmentProductCategories(segment)[0]?.value || "PECA";

export const getProductCategoryLabel = (category: string | null | undefined) =>
  CATEGORY_LABELS[String(category || "").trim().toUpperCase()] ||
  String(category || "Sem categoria").trim() ||
  "Sem categoria";

export const isVehicleCategory = (category: string | null | undefined) =>
  String(category || "").trim().toUpperCase() === VEHICLE_CATEGORY;

export const normalizeVehiclePlate = (value: string | null | undefined) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

export const formatVehiclePlate = (value: string | null | undefined) => {
  const normalized = normalizeVehiclePlate(value);

  if (normalized.length === 7) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }

  return normalized;
};

export const normalizeVehicleInventoryStatus = (
  value: string | null | undefined,
): VehicleInventoryStatus | null => {
  if (
    value === "DISPONIVEL" ||
    value === "MANUTENCAO" ||
    value === "VENDIDO"
  ) {
    return value;
  }

  return null;
};

export const getVehicleInventoryStatusLabel = (
  status: VehicleInventoryStatus | string | null | undefined,
) =>
  VEHICLE_STATUS_OPTIONS.find((option) => option.value === status)?.label ||
  String(status || "").trim() ||
  "Disponível";

export const getVehicleFuelLabel = (
  fuel: VehicleFuelOption | string | null | undefined,
) =>
  VEHICLE_FUEL_OPTIONS.find((option) => option.value === fuel)?.label ||
  String(fuel || "").trim() ||
  "Não informado";

export const getVehicleSteeringLabel = (
  steering: VehicleSteeringOption | string | null | undefined,
) =>
  VEHICLE_STEERING_OPTIONS.find((option) => option.value === steering)?.label ||
  String(steering || "").trim() ||
  "Não informado";
