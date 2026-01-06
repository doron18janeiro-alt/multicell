import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { totalCash, totalPix, totalDebit, totalCredit, totalNet } = body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const closing = await prisma.dailyClosing.upsert({
      where: { date: today },
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
        date: today,
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
