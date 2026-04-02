import { prisma } from "@/lib/prisma";

export const DEFAULT_COMPANY_PROFILE = {
  name: "Minha Empresa",
  cnpj: null,
  address: null,
  phone: null,
  logoUrl: "/logo.png",
  certificateA1: null,
  debitRate: 1.99,
  creditRate: 3.99,
  taxPix: 0,
  taxCash: 0,
} as const;

export type CompanyProfile = {
  id: string;
  companyId: string;
  name: string;
  cnpj: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  certificateA1: string | null;
  debitRate: number;
  creditRate: number;
  taxPix: number;
  taxCash: number;
};

type CompanyProfileInput = Partial<{
  name: string | null;
  cnpj: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  certificateA1: string | null;
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

const shouldHydrateCompanyNameFromLegacy = (
  companyName: string | null,
  companyId: string,
) => {
  const normalized = String(companyName || "").trim();
  return (
    !normalized ||
    normalized === companyId ||
    normalized === "Multicell" ||
    normalized === DEFAULT_COMPANY_PROFILE.name
  );
};

const buildProfileResponse = (
  company: {
    id: string;
    name: string;
    cnpj: string | null;
    address: string | null;
    phone: string | null;
    logoUrl: string | null;
    certificateA1: string | null;
  },
  config: {
    debitRate: number;
    creditRate: number;
    taxPix: number;
    taxCash: number;
  },
): CompanyProfile => ({
  id: company.id,
  companyId: company.id,
  name: normalizeName(company.name),
  cnpj: company.cnpj || null,
  document: company.cnpj || null,
  address: company.address || null,
  phone: company.phone || null,
  logoUrl: normalizeOptionalString(company.logoUrl) || DEFAULT_COMPANY_PROFILE.logoUrl,
  certificateA1: company.certificateA1 || null,
  debitRate: Number(config.debitRate ?? DEFAULT_COMPANY_PROFILE.debitRate),
  creditRate: Number(config.creditRate ?? DEFAULT_COMPANY_PROFILE.creditRate),
  taxPix: Number(config.taxPix ?? DEFAULT_COMPANY_PROFILE.taxPix),
  taxCash: Number(config.taxCash ?? DEFAULT_COMPANY_PROFILE.taxCash),
});

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
        logoUrl: DEFAULT_COMPANY_PROFILE.logoUrl,
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

  if (!normalizeOptionalString(companyRecord.logoUrl)) {
    const legacyLogoUrl =
      normalizeOptionalString((configRecord as any).logoUrl) ||
      DEFAULT_COMPANY_PROFILE.logoUrl;
    companyPatch.logoUrl = legacyLogoUrl;
  }

  const legacyName = normalizeOptionalString((configRecord as any).name);

  if (
    shouldHydrateCompanyNameFromLegacy(companyRecord.name, companyId) &&
    legacyName &&
    legacyName !== "Multicell"
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
  const resolvedCnpj = normalizeOptionalString(input.cnpj ?? input.document);
  const resolvedLogoUrl =
    normalizeOptionalString(input.logoUrl) || DEFAULT_COMPANY_PROFILE.logoUrl;

  const [company, config] = await prisma.$transaction([
    prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: normalizeName(input.name, current.name),
        cnpj: resolvedCnpj,
        address: normalizeOptionalString(input.address),
        phone: normalizeOptionalString(input.phone),
        logoUrl: resolvedLogoUrl,
        certificateA1: normalizeOptionalString(input.certificateA1),
      },
      create: {
        id: companyId,
        name: normalizeName(input.name),
        cnpj: resolvedCnpj,
        address: normalizeOptionalString(input.address),
        phone: normalizeOptionalString(input.phone),
        logoUrl: resolvedLogoUrl,
        certificateA1: normalizeOptionalString(input.certificateA1),
      },
    }),
    prisma.companyConfig.upsert({
      where: { companyId },
      update: {
        debitRate: normalizeNumber(input.debitRate, current.debitRate),
        creditRate: normalizeNumber(input.creditRate, current.creditRate),
        taxPix: normalizeNumber(input.taxPix, current.taxPix),
        taxCash: normalizeNumber(input.taxCash, current.taxCash),
      },
      create: {
        companyId,
        debitRate: normalizeNumber(input.debitRate, current.debitRate),
        creditRate: normalizeNumber(input.creditRate, current.creditRate),
        taxPix: normalizeNumber(input.taxPix, current.taxPix),
        taxCash: normalizeNumber(input.taxCash, current.taxCash),
      },
    }),
  ]);

  return buildProfileResponse(company, config);
}
