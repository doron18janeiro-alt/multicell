import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureCompanyProfile } from "@/lib/company";
import { downloadMonthlyFocusXmlArchive } from "@/lib/focus-nfe";
import { prisma } from "@/lib/prisma";

const canAccessFiscalPortal = (role: string | null | undefined) =>
  role === "ADMIN" || role === "CONTADOR";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessFiscalPortal(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const year = Number(body.year);
    const month = Number(body.month);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "Informe um mes e ano validos." },
        { status: 400 },
      );
    }

    const profile = await ensureCompanyProfile(currentUser.companyId);
    const archive = await downloadMonthlyFocusXmlArchive({
      cnpj: profile.cnpj,
      year,
      month,
    });

    await prisma.accountantXmlDownloadLog.create({
      data: {
        companyId: currentUser.companyId,
        requestedByUserId: currentUser.id,
        requestedByName: currentUser.fullName,
        requestedByEmail: currentUser.email,
        year,
        month,
        xmlZipUrl: archive.emittedZipUrl,
        backupReference: archive.backupReference,
        notes: `Emitidas + recebidas consolidadas (${archive.receivedCount} XMLs recebidos).`,
      },
    });

    return new NextResponse(archive.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
      },
    });
  } catch (error) {
    console.error("[api/config/contador/xmls][POST] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao gerar o pacote mensal de XMLs.",
      },
      {
        status:
          typeof error === "object" &&
          error &&
          "status" in error &&
          typeof (error as { status?: unknown }).status === "number"
            ? Number((error as { status: number }).status)
            : 500,
      },
    );
  }
}
