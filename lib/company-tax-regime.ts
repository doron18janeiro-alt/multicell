export const COMPANY_TAX_REGIME_LABELS = {
  SIMPLES_NACIONAL: "Simples Nacional",
  SIMPLES_EXCESSO_SUBLIMITE: "Simples com excesso de sublimite",
  REGIME_NORMAL: "Regime Normal",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
  MEI: "MEI",
} as const;

export type CompanyTaxRegimeValue = keyof typeof COMPANY_TAX_REGIME_LABELS;
