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
    // Robust date generation using Intl to strictly follow "Today" in SP
    const now = new Date();
    const brazilDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now); // Returns YYYY-MM-DD

    // Create Date objects representing the exact start/end of day in SP, converted to UTC
    const startOfDayUTC = new Date(`${brazilDateStr}T00:00:00.000-03:00`);
    const endOfDayUTC = new Date(`${brazilDateStr}T23:59:59.999-03:00`);

    // Get Company Config for Tax Rates
    const config = await prisma.companyConfig.findFirst({
      where: { companyId },
    });
    const debitRate = config?.debitRate ?? 1.99;
    const creditRate = config?.creditRate ?? 3.99;
    const taxPix = config?.taxPix ?? 0;
    const taxCash = config?.taxCash ?? 0;

    // Birthday Check
    // Prisma doesn't have easy day/month extraction in finding.
    // We will fetch all clients with birthDate and filter in JS (assuming small clientele < 10000 for now)
    // Or use raw query:
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1;

    // Efficient raw query for birthdays
    const birthdayClients = await prisma.$queryRaw`
      SELECT name, phone FROM clients 
      WHERE EXTRACT(MONTH FROM birth_date) = ${todayMonth} 
      AND EXTRACT(DAY FROM birth_date) = ${todayDay}
      AND company_id = ${companyId}
    `;

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

    let totalTaxAmount = 0;

    for (const sale of salesToday) {
      revenueToday += sale.total;

      // Tax Logic
      let currentTax = 0;
      if (sale.paymentMethod === "DINHEIRO") {
        currentTax = sale.total * (taxCash / 100);
      } else if (sale.paymentMethod === "PIX") {
        currentTax = sale.total * (taxPix / 100);
      } else if (
        sale.paymentMethod === "DEBITO" ||
        (sale.paymentMethod === "CARTAO" && sale.cardType === "DEBITO")
      ) {
        currentTax = sale.total * (debitRate / 100);
      } else if (
        sale.paymentMethod === "CREDITO" ||
        (sale.paymentMethod === "CARTAO" && sale.cardType === "CREDITO")
      ) {
        currentTax = sale.total * (creditRate / 100);
      }

      totalTaxAmount += currentTax;

      // Profit = (total - tax - cost)
      let totalCost = 0;
      for (const item of sale.items) {
        if (item.product) {
          totalCost += (item.product.costPrice || 0) * item.quantity;
        }
      }

      // If sale has explicit feeAmount saved, prefer it?
      // User says "Recupere os valores ... calcule: valor_taxa = ...".
      // So we should calculate based on current config for the dashboard view or for "Today's" dynamic view.
      // Let's use the calculated one for consistency with "Today's" summary request.
      const netAmount = sale.total - currentTax; // Using real-time calculated tax
      profitToday += netAmount - totalCost;

      salesByMethod.push({
        method: sale.paymentMethod,
        total: sale.total,
        cardType: sale.cardType,
        tax: currentTax,
      });
    }

    // 3. Valor Atual de Estoque
    const products = await prisma.product.findMany({
      where: { companyId },
    });

    const stockValue = products.reduce((acc, prod) => {
      return acc + prod.stock * prod.costPrice;
    }, 0);

    const lowStockProducts = products
      .filter((p) => p.stock <= p.minStock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minQuantity: p.minStock,
      }));

    return NextResponse.json({
      pendingCount,
      finishedCount,
      revenueToday,
      profitToday,
      totalTaxAmount,
      stockValue,
      salesByMethod,
      birthdayClients, // Added
      lowStockProducts,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
