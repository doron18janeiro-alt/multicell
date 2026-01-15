import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // Format: YYYY-MM-DD

    let whereClause = {};
    let takeAmount = 50;

    if (dateParam) {
      // Create date range for the specific date in UTC (assuming dateParam is passed correctly)
      // Simpler approach: If date is provided, filter by that day (ignoring strict TZ for now or handling broadly)
      // Let's rely on the frontend passing the correct day boundaries would be best, but let's implement a simple "contains date" logic

      // Better strategy: Filter by specific Start/End ISO strings passed from frontend which knows the Timezone
      // But let's stick to the user prompt "A query deve filtrar"

      const startOfDay = new Date(`${dateParam}T00:00:00.000-03:00`); // Force SP Timezone start
      const endOfDay = new Date(`${dateParam}T23:59:59.999-03:00`); // Force SP Timezone end

      whereClause = {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };

      takeAmount = 10000; // No limit for daily view essentially
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: takeAmount, // Limit only if no date filter
      include: {
        items: true,
      },
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar vendas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, paymentMethod, total, customerId } = body;

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;
    let netAmount = total;

    // Fetch config for rates
    const config = await prisma.companyConfig.findFirst();

    // Normalizing payment methods and calculating fees
    if (paymentMethod === "DEBITO" || paymentMethod === "CREDITO") {
      cardType = paymentMethod;
      finalPaymentMethod = "CARTAO";

      const rate =
        paymentMethod === "DEBITO"
          ? config?.debitRate ?? 1.99
          : config?.creditRate ?? 3.99;

      feeAmount = (total * rate) / 100;
      netAmount = total - feeAmount;
    }

    // Transaction to ensure data consistency
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create the Sale
      const newSale = await tx.sale.create({
        data: {
          total,
          paymentMethod: finalPaymentMethod,
          cardType,
          feeAmount,
          netAmount,
          customerId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true, // Includes customer for Receipt
        },
      });

      // 2. Update Stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Erro ao processar venda:", error);
    return NextResponse.json(
      { error: "Erro ao processar venda" },
      { status: 500 }
    );
  }
}
