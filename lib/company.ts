import { Prisma, type CompanyTaxRegime, type Segment } from "@prisma/client";
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
  legalName: null,
  stateRegistration: null,
  municipalRegistration: null,
  taxRegime: null,
  address: null,
  addressStreet: null,
  addressNumber: null,
  addressComplement: null,
  addressDistrict: null,
  addressCity: null,
  addressState: null,
  zipCode: null,
  phone: null,
  email: null,
  logoUrl: "/wtm-float.png",
  certificateA1: null,
  certificateFileBase64: null,
  certificatePassword: null,
  certificateUploadedAt: null,
  cscId: null,
  cscToken: null,
  focusCompanyId: null,
  focusSyncStatus: null,
  focusSyncMessage: null,
  focusSyncedAt: null,
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

export const COMPANY_TAX_REGIME_LABELS: Record<CompanyTaxRegime, string> = {
  SIMPLES_NACIONAL: "Simples Nacional",
  SIMPLES_EXCESSO_SUBLIMITE: "Simples com excesso de sublimite",
  REGIME_NORMAL: "Regime Normal",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
  MEI: "MEI",
};

export type CompanyProfile = {
  id: string;
  companyId: string;
  name: string;
  segment: Segment | null;
  cnpj: string | null;
  document: string | null;
  legalName: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  taxRegime: CompanyTaxRegime | null;
  address: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  certificateA1: string | null;
  certificateFileBase64: string | null;
  certificatePassword: string | null;
  certificateUploadedAt: string | null;
  cscId: string | null;
  cscToken: string | null;
  focusCompanyId: string | null;
  focusSyncStatus: string | null;
  focusSyncMessage: string | null;
  focusSyncedAt: string | null;
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
  legalName: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  taxRegime: CompanyTaxRegime | null;
  address: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  certificateA1: string | null;
  certificateFileBase64: string | null;
  certificatePassword: string | null;
  certificateUploadedAt: string | Date | null;
  cscId: string | null;
  cscToken: string | null;
  focusCompanyId: string | null;
  focusSyncStatus: string | null;
  focusSyncMessage: string | null;
  focusSyncedAt: string | Date | null;
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

const getObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const resolveDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeTaxRegime = (value: unknown): CompanyTaxRegime | null => {
  if (
    value === "SIMPLES_NACIONAL" ||
    value === "SIMPLES_EXCESSO_SUBLIMITE" ||
    value === "REGIME_NORMAL" ||
    value === "LUCRO_PRESUMIDO" ||
    value === "LUCRO_REAL" ||
    value === "MEI"
  ) {
    return value;
  }

  return null;
};

const mapTaxRegimeToFocus = (value: CompanyTaxRegime | null | undefined) => {
  switch (value) {
    case "SIMPLES_NACIONAL":
    case "MEI":
      return "1";
    case "SIMPLES_EXCESSO_SUBLIMITE":
      return "2";
    case "REGIME_NORMAL":
    case "LUCRO_PRESUMIDO":
    case "LUCRO_REAL":
      return "3";
    default:
      return null;
  }
};

const buildDisplayAddress = (company: {
  address: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  zipCode: string | null;
}) => {
  if (company.address) {
    return company.address;
  }

  const line1 = [company.addressStreet, company.addressNumber]
    .filter(Boolean)
    .join(", ");
  const line2 = [company.addressComplement, company.addressDistrict]
    .filter(Boolean)
    .join(" • ");
  const line3 = [company.addressCity, company.addressState]
    .filter(Boolean)
    .join(" / ");

  const composed = [line1, line2, line3, company.zipCode]
    .filter(Boolean)
    .join(" - ");

  return composed || null;
};

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

const buildFocusCompanyData = (input: {
  companyData: unknown;
  legalName: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  taxRegime: CompanyTaxRegime | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  zipCode: string | null;
  cscId: string | null;
  cscToken: string | null;
}) => {
  const companyDataRoot = getObject(input.companyData) || {};
  const focusCurrent = getObject(companyDataRoot.focusNfe) || companyDataRoot;

  return {
    ...companyDataRoot,
    focusNfe: {
      ...focusCurrent,
      razaoSocial: input.legalName,
      inscricaoEstadual: input.stateRegistration,
      inscricaoMunicipal: input.municipalRegistration,
      regimeTributario: mapTaxRegimeToFocus(input.taxRegime),
      logradouro: input.addressStreet,
      numero: input.addressNumber,
      complemento: input.addressComplement,
      bairro: input.addressDistrict,
      municipio: input.addressCity,
      uf: input.addressState,
      cep: input.zipCode,
      logradouroEmitente: input.addressStreet,
      numeroEmitente: input.addressNumber,
      bairroEmitente: input.addressDistrict,
      municipioEmitente: input.addressCity,
      ufEmitente: input.addressState,
      cepEmitente: input.zipCode,
      inscricaoEstadualEmitente: input.stateRegistration,
      regimeTributarioEmitente: mapTaxRegimeToFocus(input.taxRegime),
      cscNfceProducao: input.cscToken,
      idTokenNfceProducao: input.cscId,
      cscNfceHomologacao: input.cscToken,
      idTokenNfceHomologacao: input.cscId,
    },
  };
};

const buildProfileResponse = (
  company: {
    id: string;
    name: string;
    segment: Segment | null;
    cnpj: string | null;
    legalName: string | null;
    stateRegistration: string | null;
    municipalRegistration: string | null;
    taxRegime: CompanyTaxRegime | null;
    address: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressDistrict: string | null;
    addressCity: string | null;
    addressState: string | null;
    zipCode: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    certificateA1: string | null;
    certificateFileBase64: string | null;
    certificatePassword: string | null;
    certificateUploadedAt: Date | null;
    cscId: string | null;
    cscToken: string | null;
    focusCompanyId: string | null;
    focusSyncStatus: string | null;
    focusSyncMessage: string | null;
    focusSyncedAt: Date | null;
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
    legalName: company.legalName || null,
    stateRegistration: company.stateRegistration || null,
    municipalRegistration: company.municipalRegistration || null,
    taxRegime: company.taxRegime || null,
    address:
      buildDisplayAddress({
        address: company.address,
        addressStreet: company.addressStreet,
        addressNumber: company.addressNumber,
        addressComplement: company.addressComplement,
        addressDistrict: company.addressDistrict,
        addressCity: company.addressCity,
        addressState: company.addressState,
        zipCode: company.zipCode,
      }) || null,
    addressStreet: company.addressStreet || null,
    addressNumber: company.addressNumber || null,
    addressComplement: company.addressComplement || null,
    addressDistrict: company.addressDistrict || null,
    addressCity: company.addressCity || null,
    addressState: company.addressState || null,
    zipCode: company.zipCode || null,
    phone: company.phone || null,
    email: company.email || null,
    logoUrl: normalizeOptionalString(company.logoUrl),
    certificateA1: company.certificateA1 || null,
    certificateFileBase64: company.certificateFileBase64 || null,
    certificatePassword: company.certificatePassword || null,
    certificateUploadedAt: company.certificateUploadedAt?.toISOString() || null,
    cscId: company.cscId || null,
    cscToken: company.cscToken || null,
    focusCompanyId: company.focusCompanyId || null,
    focusSyncStatus: company.focusSyncStatus || null,
    focusSyncMessage: company.focusSyncMessage || null,
    focusSyncedAt: company.focusSyncedAt?.toISOString() || null,
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
    const legacyDocument = normalizeOptionalString((configRecord as { document?: string | null }).document);
    if (legacyDocument) {
      companyPatch.cnpj = legacyDocument;
    }
  }

  if (!companyRecord.address) {
    const legacyAddress = normalizeOptionalString((configRecord as { address?: string | null }).address);
    if (legacyAddress) {
      companyPatch.address = legacyAddress;
    }
  }

  if (!companyRecord.phone) {
    const legacyPhone = normalizeOptionalString((configRecord as { phone?: string | null }).phone);
    if (legacyPhone) {
      companyPatch.phone = legacyPhone;
    }
  }

  if (!companyRecord.email) {
    const legacyEmail = normalizeOptionalString((configRecord as { email?: string | null }).email);
    if (legacyEmail) {
      companyPatch.email = legacyEmail;
    }
  }

  const legacyName = normalizeOptionalString((configRecord as { name?: string | null }).name);

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

  const resolvedCnpj = normalizeOptionalString(input.cnpj ?? input.document) ?? current.cnpj;
  const resolvedLogoUrl =
    input.logoUrl === undefined
      ? current.logoUrl
      : normalizeOptionalString(input.logoUrl);
  const resolvedLegalName =
    input.legalName === undefined
      ? current.legalName
      : normalizeOptionalString(input.legalName);
  const resolvedStateRegistration =
    input.stateRegistration === undefined
      ? current.stateRegistration
      : normalizeOptionalString(input.stateRegistration);
  const resolvedMunicipalRegistration =
    input.municipalRegistration === undefined
      ? current.municipalRegistration
      : normalizeOptionalString(input.municipalRegistration);
  const resolvedTaxRegime =
    input.taxRegime === undefined
      ? current.taxRegime
      : normalizeTaxRegime(input.taxRegime);
  const resolvedAddressStreet =
    input.addressStreet === undefined
      ? current.addressStreet
      : normalizeOptionalString(input.addressStreet);
  const resolvedAddressNumber =
    input.addressNumber === undefined
      ? current.addressNumber
      : normalizeOptionalString(input.addressNumber);
  const resolvedAddressComplement =
    input.addressComplement === undefined
      ? current.addressComplement
      : normalizeOptionalString(input.addressComplement);
  const resolvedAddressDistrict =
    input.addressDistrict === undefined
      ? current.addressDistrict
      : normalizeOptionalString(input.addressDistrict);
  const resolvedAddressCity =
    input.addressCity === undefined
      ? current.addressCity
      : normalizeOptionalString(input.addressCity);
  const resolvedAddressState =
    input.addressState === undefined
      ? current.addressState
      : normalizeOptionalString(input.addressState);
  const resolvedZipCode =
    input.zipCode === undefined
      ? current.zipCode
      : normalizeOptionalString(input.zipCode);
  const resolvedAddress =
    input.address === undefined
      ? current.address
      : normalizeOptionalString(input.address);
  const resolvedPhone =
    input.phone === undefined ? current.phone : normalizeOptionalString(input.phone);
  const resolvedEmail =
    input.email === undefined ? current.email : normalizeOptionalString(input.email);
  const resolvedCertificateName =
    input.certificateA1 === undefined
      ? current.certificateA1
      : normalizeOptionalString(input.certificateA1);
  const resolvedCertificateBase64 =
    input.certificateFileBase64 === undefined
      ? current.certificateFileBase64
      : normalizeOptionalString(input.certificateFileBase64);
  const resolvedCertificatePassword =
    input.certificatePassword === undefined
      ? current.certificatePassword
      : normalizeOptionalString(input.certificatePassword);
  const resolvedCertificateUploadedAt =
    input.certificateUploadedAt === undefined
      ? resolveDate(current.certificateUploadedAt)
      : resolveDate(input.certificateUploadedAt);
  const resolvedCscId =
    input.cscId === undefined ? current.cscId : normalizeOptionalString(input.cscId);
  const resolvedCscToken =
    input.cscToken === undefined
      ? current.cscToken
      : normalizeOptionalString(input.cscToken);
  const resolvedFocusCompanyId =
    input.focusCompanyId === undefined
      ? current.focusCompanyId
      : normalizeOptionalString(input.focusCompanyId);
  const resolvedFocusSyncStatus =
    input.focusSyncStatus === undefined
      ? current.focusSyncStatus
      : normalizeOptionalString(input.focusSyncStatus);
  const resolvedFocusSyncMessage =
    input.focusSyncMessage === undefined
      ? current.focusSyncMessage
      : normalizeOptionalString(input.focusSyncMessage);
  const resolvedFocusSyncedAt =
    input.focusSyncedAt === undefined
      ? resolveDate(current.focusSyncedAt)
      : resolveDate(input.focusSyncedAt);
  const mergedCompanyData = buildFocusCompanyData({
    companyData:
      input.companyData && typeof input.companyData === "object"
        ? input.companyData
        : current.companyData || DEFAULT_COMPANY_PROFILE.companyData,
    legalName: resolvedLegalName,
    stateRegistration: resolvedStateRegistration,
    municipalRegistration: resolvedMunicipalRegistration,
    taxRegime: resolvedTaxRegime,
    addressStreet: resolvedAddressStreet,
    addressNumber: resolvedAddressNumber,
    addressComplement: resolvedAddressComplement,
    addressDistrict: resolvedAddressDistrict,
    addressCity: resolvedAddressCity,
    addressState: resolvedAddressState,
    zipCode: resolvedZipCode,
    cscId: resolvedCscId,
    cscToken: resolvedCscToken,
  });

  const [company, config] = await prisma.$transaction([
    prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: normalizeName(input.name, current.name),
        segment:
          input.segment === undefined ? current.segment : input.segment || null,
        cnpj: resolvedCnpj,
        legalName: resolvedLegalName,
        stateRegistration: resolvedStateRegistration,
        municipalRegistration: resolvedMunicipalRegistration,
        taxRegime: resolvedTaxRegime,
        address: resolvedAddress,
        addressStreet: resolvedAddressStreet,
        addressNumber: resolvedAddressNumber,
        addressComplement: resolvedAddressComplement,
        addressDistrict: resolvedAddressDistrict,
        addressCity: resolvedAddressCity,
        addressState: resolvedAddressState,
        zipCode: resolvedZipCode,
        phone: resolvedPhone,
        email: resolvedEmail,
        logoUrl: resolvedLogoUrl,
        certificateA1: resolvedCertificateName,
        certificateFileBase64: resolvedCertificateBase64,
        certificatePassword: resolvedCertificatePassword,
        certificateUploadedAt: resolvedCertificateUploadedAt,
        cscId: resolvedCscId,
        cscToken: resolvedCscToken,
        focusCompanyId: resolvedFocusCompanyId,
        focusSyncStatus: resolvedFocusSyncStatus,
        focusSyncMessage: resolvedFocusSyncMessage,
        focusSyncedAt: resolvedFocusSyncedAt,
        companyData: mergedCompanyData as Prisma.InputJsonValue,
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
        legalName: resolvedLegalName,
        stateRegistration: resolvedStateRegistration,
        municipalRegistration: resolvedMunicipalRegistration,
        taxRegime: resolvedTaxRegime,
        address: resolvedAddress,
        addressStreet: resolvedAddressStreet,
        addressNumber: resolvedAddressNumber,
        addressComplement: resolvedAddressComplement,
        addressDistrict: resolvedAddressDistrict,
        addressCity: resolvedAddressCity,
        addressState: resolvedAddressState,
        zipCode: resolvedZipCode,
        phone: resolvedPhone,
        email: resolvedEmail,
        logoUrl: resolvedLogoUrl ?? DEFAULT_COMPANY_PROFILE.logoUrl,
        certificateA1: resolvedCertificateName,
        certificateFileBase64: resolvedCertificateBase64,
        certificatePassword: resolvedCertificatePassword,
        certificateUploadedAt: resolvedCertificateUploadedAt,
        cscId: resolvedCscId,
        cscToken: resolvedCscToken,
        focusCompanyId: resolvedFocusCompanyId,
        focusSyncStatus: resolvedFocusSyncStatus,
        focusSyncMessage: resolvedFocusSyncMessage,
        focusSyncedAt: resolvedFocusSyncedAt,
        companyData: mergedCompanyData as Prisma.InputJsonValue,
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
        address:
          resolvedAddress ||
          buildDisplayAddress({
            address: null,
            addressStreet: resolvedAddressStreet,
            addressNumber: resolvedAddressNumber,
            addressComplement: resolvedAddressComplement,
            addressDistrict: resolvedAddressDistrict,
            addressCity: resolvedAddressCity,
            addressState: resolvedAddressState,
            zipCode: resolvedZipCode,
          }),
        phone: resolvedPhone,
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
        address:
          resolvedAddress ||
          buildDisplayAddress({
            address: null,
            addressStreet: resolvedAddressStreet,
            addressNumber: resolvedAddressNumber,
            addressComplement: resolvedAddressComplement,
            addressDistrict: resolvedAddressDistrict,
            addressCity: resolvedAddressCity,
            addressState: resolvedAddressState,
            zipCode: resolvedZipCode,
          }),
        phone: resolvedPhone,
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
