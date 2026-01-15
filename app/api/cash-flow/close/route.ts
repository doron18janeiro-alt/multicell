import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    const body = await req.json();
    const { totalCash, totalPix, totalDebit, totalCredit, totalNet, date } =
      body;

    // Use provided date or today. If date passed as "yyyy-mm-dd", parse it.
    let closingDate = new Date();
    if (date) {
      // Force time to midday to avoid timezone shifts during storage
      closingDate = new Date(`${date}T12:00:00.000Z`);
    } else {
      closingDate.setHours(0, 0, 0, 0);
    }

    const closing = await prisma.dailyClosing.upsert({
      where: {
        date_companyId: {
          date: closingDate,
          companyId,
        },
      },
      update: {
        totalCash,
        totalPix,
        totalDebit,
        totalCredit,
        totalNet,
        status: "CLOSED",
        closedAt: new Date(),
      },
      create: {
        companyId,
        date: closingDate,
        totalCash,
        totalPix,
        totalDebit,
        totalCredit,
        totalNet,
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    return NextResponse.json(closing);
  } catch (error) {
    console.error("Error closing cash register:", error);
    return NextResponse.json(
      { error: "Erro ao fechar o caixa" },
      { status: 500 }
    );
  }
}
