import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureCompanyProfile, updateCompanyProfile } from "@/lib/company";
import { syncCompanyWithFocus } from "@/lib/focus-nfe";
import { prisma } from "@/lib/prisma";

const canAccessFiscalPortal = (role: string | null | undefined) =>
  role === "ADMIN" || role === "CONTADOR";

const getRecentXmlDownloadLogs = async (companyId: string) => {
  const logs = await prisma.accountantXmlDownloadLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return logs.map((log) => ({
    id: log.id,
    year: log.year,
    month: log.month,
    xmlZipUrl: log.xmlZipUrl,
    backupReference: log.backupReference,
    requestedByName: log.requestedByName,
    requestedByEmail: log.requestedByEmail,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
  }));
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessFiscalPortal(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await ensureCompanyProfile(currentUser.companyId);
    const xmlDownloadLogs = await getRecentXmlDownloadLogs(currentUser.companyId);

    return NextResponse.json({
      ...profile,
      xmlDownloadLogs,
    });
  } catch (error) {
    console.error("[api/config/contador][GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar o portal fiscal." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessFiscalPortal(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    let profile = await updateCompanyProfile(currentUser.companyId, body);

    if (body.syncWithFocus) {
      try {
        const syncResult = await syncCompanyWithFocus({
          companyId: currentUser.companyId,
          cnpj: profile.cnpj,
          name: profile.name,
          legalName: profile.legalName,
          stateRegistration: profile.stateRegistration,
          municipalRegistration: profile.municipalRegistration,
          taxRegime: profile.taxRegime,
          addressStreet: profile.addressStreet,
          addressNumber: profile.addressNumber,
          addressComplement: profile.addressComplement,
          addressDistrict: profile.addressDistrict,
          addressCity: profile.addressCity,
          addressState: profile.addressState,
          zipCode: profile.zipCode,
          phone: profile.phone,
          email: profile.email,
          certificateFileBase64: profile.certificateFileBase64,
          certificatePassword: profile.certificatePassword,
          cscId: profile.cscId,
          cscToken: profile.cscToken,
        });

        profile = await updateCompanyProfile(currentUser.companyId, {
          focusCompanyId: syncResult.id,
          focusSyncStatus: syncResult.operation,
          focusSyncMessage:
            syncResult.operation === "created"
              ? "Empresa criada e sincronizada com a Focus."
              : "Empresa atualizada e sincronizada com a Focus.",
          focusSyncedAt: new Date(),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel sincronizar com a Focus.";

        profile = await updateCompanyProfile(currentUser.companyId, {
          focusSyncStatus: "error",
          focusSyncMessage: message,
          focusSyncedAt: new Date(),
        });

        return NextResponse.json(
          {
            error: message,
            profile,
          },
          {
            status:
              typeof error === "object" &&
              error &&
              "status" in error &&
              typeof (error as { status?: unknown }).status === "number"
                ? Number((error as { status: number }).status)
                : 422,
          },
        );
      }
    }

    const xmlDownloadLogs = await getRecentXmlDownloadLogs(currentUser.companyId);

    return NextResponse.json({
      ...profile,
      xmlDownloadLogs,
    });
  } catch (error) {
    console.error("[api/config/contador][PUT] Error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configuracoes fiscais." },
      { status: 500 },
    );
  }
}
