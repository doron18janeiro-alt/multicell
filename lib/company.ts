import { Prisma, type Segment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AUTO_FINANCING_SETTINGS,
  buildAutoFinancingSettingsPayload,
} from "@/lib/auto-financing";
import { normalizeCurrencyNumber } from "@/lib/nfe-wallet";

export const DEFAULT_COMPANY_PROFILE = {
  name: "Sua Empresa Aqui",
  segment: null,
  cnpj: null,
  address: null,
  phone: null,
  email: null,
  logoUrl: "/wtm-float.png",
  certificateA1: null,
  companyData: null,
  settings: {
    autoFinancing: DEFAULT_AUTO_FINANCING_SETTINGS,
  },
  nfeBalance: 0,
  autoTopUp: false,
  debitRate: 1.99,
  creditRate: 3.99,
  taxPix: 0,
  taxCash: 0,
} as const;

export type CompanyProfile = {
  id: string;
  companyId: string;
  name: string;
  segment: Segment | null;
  cnpj: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  certificateA1: string | null;
  companyData: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  nfeBalance: number;
  autoTopUp: boolean;
  debitRate: number;
  creditRate: number;
  taxPix: number;
  taxCash: number;
  creditInstallmentRate: number;
  bankRates: Record<string, number>;
};

type CompanyProfileInput = Partial<{
  name: string | null;
  segment: Segment | null;
  cnpj: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  certificateA1: string | null;
  companyData: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  nfeBalance: number | string | null;
  autoTopUp: boolean | null;
  debitRate: number | string | null;
  creditRate: number | string | null;
  taxPix: number | string | null;
  taxCash: number | string | null;
}>;

const normalizeOptionalString = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const normalizeName = (
  value: unknown,
  fallback: string = DEFAULT_COMPANY_PROFILE.name,
) => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const normalizeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveSettingsObject = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : (DEFAULT_COMPANY_PROFILE.settings as Record<string, unknown>);

const LEGACY_BRAND_NAMES = new Set(["multicell", "world tech manager"]);

const shouldHydrateCompanyNameFromLegacy = (
  companyName: string | null,
  companyId: string,
) => {
  const normalized = String(companyName || "").trim();
  return (
    !normalized ||
    normalized === companyId ||
    LEGACY_BRAND_NAMES.has(normalized.toLowerCase()) ||
    normalized === DEFAULT_COMPANY_PROFILE.name
  );
};

const buildProfileResponse = (
  company: {
    id: string;
    name: string;
    segment: Segment | null;
    cnpj: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    certificateA1: string | null;
    companyData: unknown;
    settings: unknown;
    nfeBalance: unknown;
    autoTopUp: boolean;
  },
  config: {
    debitRate: number;
    creditRate: number;
    taxPix: number;
    taxCash: number;
  },
): CompanyProfile => {
  const resolvedSettings = resolveSettingsObject(company.settings);
  const autoFinancingSettings = buildAutoFinancingSettingsPayload(
    resolvedSettings.autoFinancing,
  );

  return {
    id: company.id,
    companyId: company.id,
    name: normalizeName(company.name),
    segment: company.segment || null,
    cnpj: company.cnpj || null,
    document: company.cnpj || null,
    address: company.address || null,
    phone: company.phone || null,
    email: company.email || null,
    logoUrl: normalizeOptionalString(company.logoUrl),
    certificateA1: company.certificateA1 || null,
    companyData:
      company.companyData && typeof company.companyData === "object"
        ? (company.companyData as Record<string, unknown>)
        : DEFAULT_COMPANY_PROFILE.companyData,
    settings: resolvedSettings,
    nfeBalance: normalizeCurrencyNumber(company.nfeBalance),
    autoTopUp: Boolean(company.autoTopUp),
    debitRate: Number(config.debitRate ?? DEFAULT_COMPANY_PROFILE.debitRate),
    creditRate: Number(config.creditRate ?? DEFAULT_COMPANY_PROFILE.creditRate),
    taxPix: Number(config.taxPix ?? DEFAULT_COMPANY_PROFILE.taxPix),
    taxCash: Number(config.taxCash ?? DEFAULT_COMPANY_PROFILE.taxCash),
    creditInstallmentRate: autoFinancingSettings.creditInstallmentRate,
    bankRates: autoFinancingSettings.bankRates,
  };
};

export async function ensureCompanyProfile(
  companyId: string,
): Promise<CompanyProfile> {
  const [companyRecord, configRecord] = await prisma.$transaction([
    prisma.company.upsert({
      where: { id: companyId },
      update: {},
      create: {
        id: companyId,
        name: DEFAULT_COMPANY_PROFILE.name,
        segment: DEFAULT_COMPANY_PROFILE.segment,
        logoUrl: DEFAULT_COMPANY_PROFILE.logoUrl,
        companyData: DEFAULT_COMPANY_PROFILE.companyData,
        settings: DEFAULT_COMPANY_PROFILE.settings,
        nfeBalance: DEFAULT_COMPANY_PROFILE.nfeBalance,
        autoTopUp: DEFAULT_COMPANY_PROFILE.autoTopUp,
      },
    }),
    prisma.companyConfig.upsert({
      where: { companyId },
      update: {},
      create: {
        companyId,
        name: DEFAULT_COMPANY_PROFILE.name,
        debitRate: DEFAULT_COMPANY_PROFILE.debitRate,
        creditRate: DEFAULT_COMPANY_PROFILE.creditRate,
        taxPix: DEFAULT_COMPANY_PROFILE.taxPix,
        taxCash: DEFAULT_COMPANY_PROFILE.taxCash,
      },
    }),
  ]);

  const companyPatch: {
    name?: string;
    cnpj?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
  } = {};

  if (!companyRecord.cnpj) {
    const legacyDocument = normalizeOptionalString((configRecord as any).document);
    if (legacyDocument) {
      companyPatch.cnpj = legacyDocument;
    }
  }

  if (!companyRecord.address) {
    const legacyAddress = normalizeOptionalString((configRecord as any).address);
    if (legacyAddress) {
      companyPatch.address = legacyAddress;
    }
  }

  if (!companyRecord.phone) {
    const legacyPhone = normalizeOptionalString((configRecord as any).phone);
    if (legacyPhone) {
      companyPatch.phone = legacyPhone;
    }
  }

  if (!companyRecord.email) {
    const legacyEmail = normalizeOptionalString((configRecord as any).email);
    if (legacyEmail) {
      companyPatch.email = legacyEmail;
    }
  }

  const legacyName = normalizeOptionalString((configRecord as any).name);

  if (
    shouldHydrateCompanyNameFromLegacy(companyRecord.name, companyId) &&
    legacyName &&
    !LEGACY_BRAND_NAMES.has(legacyName.toLowerCase())
  ) {
    companyPatch.name = normalizeName(legacyName);
  }

  const company =
    Object.keys(companyPatch).length > 0
      ? await prisma.company.update({
          where: { id: companyId },
          data: companyPatch,
        })
      : companyRecord;

  return buildProfileResponse(company, configRecord);
}

export async function updateCompanyProfile(
  companyId: string,
  input: CompanyProfileInput,
): Promise<CompanyProfile> {
  const current = await ensureCompanyProfile(companyId);
  const currentSettings = resolveSettingsObject(current.settings);
  const inputSettings =
    input.settings && typeof input.settings === "object"
      ? (input.settings as Record<string, unknown>)
      : null;
  const mergedSettings = inputSettings
    ? {
        ...currentSettings,
        ...inputSettings,
        autoFinancing: buildAutoFinancingSettingsPayload(
          (inputSettings.autoFinancing as Record<string, unknown> | undefined) ??
            currentSettings.autoFinancing,
        ),
      }
    : currentSettings;
  const resolvedCnpj = normalizeOptionalString(input.cnpj ?? input.document);
  const resolvedLogoUrl =
    input.logoUrl === undefined
      ? current.logoUrl
      : normalizeOptionalString(input.logoUrl);

  const [company, config] = await prisma.$transaction([
    prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: normalizeName(input.name, current.name),
        segment:
          input.segment === undefined ? current.segment : input.segment || null,
        cnpj: resolvedCnpj,
        address: normalizeOptionalString(input.address),
        phone: normalizeOptionalString(input.phone),
        email: normalizeOptionalString(input.email),
        logoUrl: resolvedLogoUrl,
        certificateA1: normalizeOptionalString(input.certificateA1),
        companyData:
          input.companyData && typeof input.companyData === "object"
            ? input.companyData
            : current.companyData || DEFAULT_COMPANY_PROFILE.companyData,
        settings: mergedSettings as Prisma.InputJsonValue,
        nfeBalance: normalizeCurrencyNumber(
          input.nfeBalance ?? current.nfeBalance,
        ),
        autoTopUp:
          input.autoTopUp === undefined || input.autoTopUp === null
            ? current.autoTopUp
            : Boolean(input.autoTopUp),
      },
      create: {
        id: companyId,
        name: normalizeName(input.name),
        segment: input.segment || DEFAULT_COMPANY_PROFILE.segment,
        cnpj: resolvedCnpj,
        address: normalizeOptionalString(input.address),
        phone: normalizeOptionalString(input.phone),
        email: normalizeOptionalString(input.email),
        logoUrl: resolvedLogoUrl ?? DEFAULT_COMPANY_PROFILE.logoUrl,
        certificateA1: normalizeOptionalString(input.certificateA1),
        companyData:
          input.companyData && typeof input.companyData === "object"
            ? input.companyData
            : DEFAULT_COMPANY_PROFILE.companyData,
        settings: mergedSettings as Prisma.InputJsonValue,
        nfeBalance: normalizeCurrencyNumber(
          input.nfeBalance ?? DEFAULT_COMPANY_PROFILE.nfeBalance,
        ),
        autoTopUp:
          input.autoTopUp === undefined || input.autoTopUp === null
            ? DEFAULT_COMPANY_PROFILE.autoTopUp
            : Boolean(input.autoTopUp),
      },
    }),
    prisma.companyConfig.upsert({
      where: { companyId },
      update: {
        name: normalizeName(input.name, current.name),
        address: normalizeOptionalString(input.address),
        phone: normalizeOptionalString(input.phone),
        document: resolvedCnpj,
        logoUrl: resolvedLogoUrl,
        debitRate: normalizeNumber(input.debitRate, current.debitRate),
        creditRate: normalizeNumber(input.creditRate, current.creditRate),
        taxPix: normalizeNumber(input.taxPix, current.taxPix),
        taxCash: normalizeNumber(input.taxCash, current.taxCash),
      },
      create: {
        companyId,
        name: normalizeName(input.name, current.name),
        address: normalizeOptionalString(input.address),
        phone: normalizeOptionalString(input.phone),
        document: resolvedCnpj,
        logoUrl: resolvedLogoUrl ?? DEFAULT_COMPANY_PROFILE.logoUrl,
        debitRate: normalizeNumber(input.debitRate, current.debitRate),
        creditRate: normalizeNumber(input.creditRate, current.creditRate),
        taxPix: normalizeNumber(input.taxPix, current.taxPix),
        taxCash: normalizeNumber(input.taxCash, current.taxCash),
      },
    }),
  ]);

  return buildProfileResponse(company, config);
}
