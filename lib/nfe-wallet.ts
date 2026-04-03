export const LOW_BALANCE_THRESHOLD = 10;
export const NFE_EMISSION_COST = 0.5;
export const DEFAULT_NFE_RECHARGE_AMOUNT = 50;

export const normalizeCurrencyNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const hasLowNfeBalance = (value: unknown) =>
  normalizeCurrencyNumber(value) < LOW_BALANCE_THRESHOLD;

export const canIssueNfe = (value: unknown) =>
  normalizeCurrencyNumber(value) >= NFE_EMISSION_COST;
