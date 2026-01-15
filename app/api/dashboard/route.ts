import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = session.user.companyId;

    // Timezone setup: America/Sao_Paulo (UTC-3)
    const brazilOffset = -3;
    const now = new Date();
    // Calculate local time in milliseconds
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const brazilTime = new Date(utcTime + 3600000 * brazilOffset);

    const startOfDay = new Date(brazilTime);
    startOfDay.setHours(0, 0, 0, 0);
    // Convert back to UTC for Prisma query
    const startOfDayUTC = new Date(
      startOfDay.getTime() - 3600000 * brazilOffset
    );

    const endOfDay = new Date(brazilTime);
    endOfDay.setHours(23, 59, 59, 999);
    // Convert back to UTC for Prisma query
    const endOfDayUTC = new Date(endOfDay.getTime() - 3600000 * brazilOffset);

    // 1. O.S. em Andamento (Status = ABERTO)
    const pendingCount = await prisma.serviceOrder.count({
      where: {
        companyId,
        status: "ABERTO", // Explicitly "ABERTO" per request, but usually "PENDING WORK" is multiple statuses
        // The prompt says: "Contagem de registros na tabela os com status 'ABERTO'."
      },
    });

    // Also counting Finished for the dashboard generic view if needed, but specifically requested ABERTO
    const finishedCount = await prisma.serviceOrder.count({
      where: { companyId, status: "FINALIZADO" },
    });

    // 2. Faturamento e Lucro Líquido (Sales de Hoje)
    const salesToday = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startOfDayUTC,
          lte: endOfDayUTC,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    let revenueToday = 0;
    let profitToday = 0;
    const salesByMethod: any[] = [];

    for (const sale of salesToday) {
      revenueToday += sale.total;

      // Lucro = (total - cost - fee)
      // Cost is per item
      let totalCost = 0;
      for (const item of sale.items) {
        if (item.product) {
          totalCost += (item.product.costPrice || 0) * item.quantity;
        }
      }

      const netAmount = sale.netAmount || sale.total - (sale.feeAmount || 0);
      profitToday += netAmount - totalCost;

      salesByMethod.push({
        method: sale.paymentMethod,
        total: sale.total,
        cardType: sale.cardType,
      });
    }

    // 3. Valor Atual de Estoque
    const products = await prisma.product.findMany({
      where: { companyId },
    });

    const stockValue = products.reduce((acc, prod) => {
      return acc + prod.stock * prod.costPrice;
    }, 0);

    return NextResponse.json({
      pendingCount,
      finishedCount,
      revenueToday,
      profitToday,
      stockValue,
      salesByMethod,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
