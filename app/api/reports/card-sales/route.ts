import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = currentUser.companyId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const config = await prisma.companyConfig.findFirst({
      where: { companyId },
    });

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        OR: [{ paymentMethod: "CARTAO" }, { cardType: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
    });

    const debitSales = sales.filter((s) => s.cardType === "DEBITO");
    const creditSales = sales.filter((s) => s.cardType === "CREDITO");

    const debitTotal = debitSales.reduce(
      (acc, curr) => acc + (curr.total || 0),
      0,
    );
    const creditTotal = creditSales.reduce(
      (acc, curr) => acc + (curr.total || 0),
      0,
    );

    return NextResponse.json({
      summary: {
        debitTotal: debitTotal || 0,
        creditTotal: creditTotal || 0,
      },
      sales: sales.map((s) => ({
        id: s.id,
        total: s.total || 0,
        cardType: s.cardType,
        createdAt: s.createdAt,
      })),
      config: {
        debitRate: config?.debitRate ?? 1.99,
        creditRate: config?.creditRate ?? 3.99,
      },
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json({
      summary: { debitTotal: 0, creditTotal: 0 },
      sales: [],
      config: { debitRate: 0, creditRate: 0 },
    });
  }
}
