export const AUTO_FINANCING_BANKS = [
  { key: "ITAU", label: "Itaú (iCarros)" },
  { key: "BRADESCO", label: "Bradesco" },
  { key: "SANTANDER", label: "Santander" },
  { key: "BV", label: "BV Financeira" },
  { key: "PAN", label: "Banco Pan" },
  { key: "SAFRA", label: "Safra" },
  { key: "PORTO", label: "Porto Seguro" },
  { key: "CAIXA", label: "Caixa" },
  { key: "BB", label: "Banco do Brasil" },
] as const;

export type AutoFinancingBankKey = (typeof AUTO_FINANCING_BANKS)[number]["key"];

export type AutoFinancingSettings = {
  creditInstallmentRate: number;
  bankRates: Record<AutoFinancingBankKey, number>;
};

export const DEFAULT_AUTO_FINANCING_SETTINGS: AutoFinancingSettings = {
  creditInstallmentRate: 2.49,
  bankRates: {
    ITAU: 1.99,
    BRADESCO: 1.99,
    SANTANDER: 1.99,
    BV: 2.09,
    PAN: 2.19,
    SAFRA: 1.95,
    PORTO: 2.05,
    CAIXA: 1.89,
    BB: 1.93,
  },
};

const roundMoney = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const normalizeAutoFinancingSettings = (
  value: unknown,
): AutoFinancingSettings => {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const bankRatesSource =
    raw.bankRates && typeof raw.bankRates === "object"
      ? (raw.bankRates as Record<string, unknown>)
      : {};

  const bankRates = AUTO_FINANCING_BANKS.reduce(
    (accumulator, bank) => {
      const rawValue = Number(bankRatesSource[bank.key]);
      accumulator[bank.key] = Number.isFinite(rawValue)
        ? rawValue
        : DEFAULT_AUTO_FINANCING_SETTINGS.bankRates[bank.key];
      return accumulator;
    },
    {} as Record<AutoFinancingBankKey, number>,
  );

  const creditInstallmentRate = Number(raw.creditInstallmentRate);

  return {
    creditInstallmentRate: Number.isFinite(creditInstallmentRate)
      ? creditInstallmentRate
      : DEFAULT_AUTO_FINANCING_SETTINGS.creditInstallmentRate,
    bankRates,
  };
};

export const buildAutoFinancingSettingsPayload = (
  value: unknown,
): AutoFinancingSettings => normalizeAutoFinancingSettings(value);

export const getBankLabelByKey = (key: string | null | undefined) =>
  AUTO_FINANCING_BANKS.find((bank) => bank.key === key)?.label ||
  String(key || "").trim() ||
  "Banco não informado";

export const getBankKeyByLabel = (label: string | null | undefined) =>
  AUTO_FINANCING_BANKS.find((bank) => bank.label === label)?.key || null;

export const calculatePriceInstallment = (
  principal: number,
  monthlyRatePercent: number,
  installments: number,
) => {
  const normalizedPrincipal = Number(principal || 0);
  const normalizedInstallments = Math.max(Number(installments || 0), 1);
  const monthlyRate = Number(monthlyRatePercent || 0) / 100;

  if (normalizedPrincipal <= 0) {
    return 0;
  }

  if (monthlyRate <= 0) {
    return roundMoney(normalizedPrincipal / normalizedInstallments);
  }

  const factor = Math.pow(1 + monthlyRate, normalizedInstallments);
  return roundMoney(
    normalizedPrincipal * ((monthlyRate * factor) / (factor - 1)),
  );
};

export const calculateCardInstallmentPlan = ({
  baseAmount,
  monthlyRate,
  installments,
}: {
  baseAmount: number;
  monthlyRate: number;
  installments: number;
}) => {
  const normalizedBase = Number(baseAmount || 0);
  const normalizedInstallments = Math.max(Number(installments || 1), 1);

  if (normalizedBase <= 0) {
    return {
      installments: normalizedInstallments,
      monthlyRate: Number(monthlyRate || 0),
      installmentValue: 0,
      totalCharged: 0,
      totalInterest: 0,
    };
  }

  const installmentValue =
    normalizedInstallments <= 1
      ? roundMoney(normalizedBase)
      : calculatePriceInstallment(
          normalizedBase,
          Number(monthlyRate || 0),
          normalizedInstallments,
        );
  const totalCharged = roundMoney(installmentValue * normalizedInstallments);

  return {
    installments: normalizedInstallments,
    monthlyRate: Number(monthlyRate || 0),
    installmentValue,
    totalCharged,
    totalInterest: roundMoney(totalCharged - normalizedBase),
  };
};

export const calculateFinancingPlan = ({
  vehiclePrice,
  entry,
  monthlyRate,
  installments,
  tac,
  iof,
}: {
  vehiclePrice: number;
  entry: number;
  monthlyRate: number;
  installments: number;
  tac: number;
  iof: number;
}) => {
  const normalizedVehiclePrice = Number(vehiclePrice || 0);
  const normalizedEntry = Math.min(
    Math.max(Number(entry || 0), 0),
    normalizedVehiclePrice,
  );
  const normalizedTac = Math.max(Number(tac || 0), 0);
  const normalizedIof = Math.max(Number(iof || 0), 0);
  const baseFinancedAmount = Math.max(normalizedVehiclePrice - normalizedEntry, 0);
  const financedPrincipal = roundMoney(
    baseFinancedAmount + normalizedTac + normalizedIof,
  );
  const normalizedInstallments = Math.max(Number(installments || 12), 1);
  const installmentValue = calculatePriceInstallment(
    financedPrincipal,
    Number(monthlyRate || 0),
    normalizedInstallments,
  );
  const totalFinanced = roundMoney(installmentValue * normalizedInstallments);
  const customerTotal = roundMoney(normalizedEntry + totalFinanced);

  return {
    vehiclePrice: normalizedVehiclePrice,
    entry: normalizedEntry,
    monthlyRate: Number(monthlyRate || 0),
    installments: normalizedInstallments,
    tac: normalizedTac,
    iof: normalizedIof,
    baseFinancedAmount: roundMoney(baseFinancedAmount),
    financedPrincipal,
    installmentValue,
    totalFinanced,
    customerTotal,
    totalExtraCost: roundMoney(customerTotal - normalizedVehiclePrice),
  };
};
