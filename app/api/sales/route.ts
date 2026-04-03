import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NFE_EMISSION_COST } from "@/lib/nfe-wallet";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";
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
        seller: {
          select: {
            id: true,
            fullName: true,
            name: true,
            commissionRate: true,
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const body = await request.json();
    const { items, paymentMethod, total, customerId, issueNfe } = body;

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;
    let netAmount = total;

    // Fetch config for rates
    const config = await prisma.companyConfig.findFirst({
      where: { companyId },
    });
    const company = issueNfe
      ? await prisma.company.findUnique({
          where: { id: companyId },
          select: { nfeBalance: true },
        })
      : null;
    const currentNfeBalance = Number(company?.nfeBalance || 0);

    if (issueNfe && currentNfeBalance < NFE_EMISSION_COST) {
      return NextResponse.json(
        {
          error: "Saldo insuficiente para emitir nota. Recarregue agora.",
          code: "NFE_BALANCE_LOW",
          nfeBalance: currentNfeBalance,
          requiredAmount: NFE_EMISSION_COST,
        },
        { status: 402 },
      );
    }

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
          sellerId: currentUser.id,
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
          seller: {
            select: {
              id: true,
              fullName: true,
              name: true,
              commissionRate: true,
            },
          },
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

      if (issueNfe) {
        await tx.company.update({
          where: { id: companyId },
          data: {
            nfeBalance: {
              decrement: NFE_EMISSION_COST,
            },
          },
        });

        await tx.nfeLog.create({
          data: {
            companyId,
            saleId: newSale.id,
            documentNumber: `Nota #${newSale.id}`,
            amount: NFE_EMISSION_COST,
          },
        });
      }

      return newSale;
    });

    return NextResponse.json(
      {
        ...sale,
        nfeIssued: Boolean(issueNfe),
        nfeCost: issueNfe ? NFE_EMISSION_COST : 0,
        remainingNfeBalance: issueNfe
          ? Number((currentNfeBalance - NFE_EMISSION_COST).toFixed(2))
          : currentNfeBalance,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao processar venda:", error);
    return NextResponse.json(
      { error: "Erro ao processar venda" },
      { status: 500 },
    );
  }
}
