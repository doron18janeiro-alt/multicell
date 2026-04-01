import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId || "multicell-oficial";
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const whereClause: any = {
      companyId,
      status: {
        not: "REFUNDED",
      },
    };
    let takeAmount = 50;

    if (startDateParam && endDateParam) {
      const startDate =
        startDateParam <= endDateParam ? startDateParam : endDateParam;
      const endDate =
        endDateParam >= startDateParam ? endDateParam : startDateParam;
      whereClause.createdAt = {
        gte: new Date(`${startDate}T00:00:00.000-03:00`),
        lte: new Date(`${endDate}T23:59:59.999-03:00`),
      };
      takeAmount = 10000;
    } else if (dateParam) {
      whereClause.createdAt = {
        gte: new Date(`${dateParam}T00:00:00.000-03:00`),
        lte: new Date(`${dateParam}T23:59:59.999-03:00`),
      };
      takeAmount = 10000;
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: takeAmount,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar vendas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId || "multicell-oficial";
    const body = await request.json();
    const { items, paymentMethod, total, customerId } = body;

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;
    let netAmount = total;

    // Fetch config for rates
    const config = await prisma.companyConfig.findFirst({
      where: { companyId },
    });

    // Normalizing payment methods and calculating fees
    if (paymentMethod === "DEBITO" || paymentMethod === "CREDITO") {
      cardType = paymentMethod;
      finalPaymentMethod = "CARTAO";

      const rate =
        paymentMethod === "DEBITO"
          ? (config?.debitRate ?? 1.99)
          : (config?.creditRate ?? 3.99);

      feeAmount = (total * rate) / 100;
      netAmount = total - feeAmount;
    }

    // Transaction to ensure data consistency
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create the Sale
      const newSale = await tx.sale.create({
        data: {
          companyId,
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
      { status: 500 },
    );
  }
}
