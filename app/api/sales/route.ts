import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NFE_EMISSION_COST } from "@/lib/nfe-wallet";
import {
  emitirNota,
  FocusNfeError,
  registerSuccessfulNfeEmission,
} from "@/lib/focus-nfe";

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
  let currentNfeBalance = 0;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const body = await request.json();
    const {
      items,
      paymentMethod,
      total,
      customerId,
      issueNfe,
      financingBank,
      cardInstallments,
      cardMonthlyRate,
      financingEntry,
      financingInstallments,
      financingMonthlyRate,
      financingTac,
      financingIof,
      financingInstallmentValue,
      financingFinancedAmount,
    } = body;

    let finalPaymentMethod = paymentMethod;
    let cardType = null;
    let feeAmount = 0;
    let netAmount = total;

    const config = await prisma.companyConfig.findFirst({
      where: { companyId },
    });
    const company = issueNfe
      ? await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            cnpj: true,
            address: true,
            phone: true,
            email: true,
            companyData: true,
            nfeBalance: true,
          },
        })
      : null;
    const customer =
      issueNfe && customerId
        ? await prisma.customer.findFirst({
            where: {
              id: customerId,
              companyId,
            },
            select: {
              id: true,
              name: true,
              phone: true,
              document: true,
            },
          })
        : null;
    const productIds: string[] = Array.from(
      new Set(
        items
          .map((item: any) => String(item?.productId || "").trim())
          .filter(Boolean),
      ),
    );
    const products = productIds.length
      ? await prisma.product.findMany({
          where: {
            companyId,
            id: {
              in: productIds,
            },
          },
          select: {
            id: true,
            name: true,
            barcode: true,
          },
        })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    currentNfeBalance = Number(company?.nfeBalance || 0);

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

    if (issueNfe && !company) {
      return NextResponse.json(
        { error: "Empresa nao encontrada para emissao fiscal." },
        { status: 404 },
      );
    }

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

    const focusResult =
      issueNfe && company
        ? await emitirNota({
            reference: `wtm-sale-${companyId}-${Date.now()}`,
            company: {
              companyId,
              name: company.name,
              cnpj: company.cnpj,
              address: company.address,
              phone: company.phone,
              email: company.email,
              companyData:
                company.companyData && typeof company.companyData === "object"
                  ? (company.companyData as Record<string, unknown>)
                  : null,
            },
            customer: customer
              ? {
                  id: customer.id,
                  name: customer.name,
                  phone: customer.phone,
                  document: customer.document,
                }
              : null,
            items: items.map((item: any) => {
              const productId = String(item.productId || "").trim();
              const product = productMap.get(productId);

              if (!product) {
                throw new FocusNfeError(
                  `Produto ${productId} nao encontrado para emissao fiscal.`,
                  {
                    code: "FOCUS_NFE_PRODUCT_NOT_FOUND",
                    status: 422,
                  },
                );
              }

              return {
                productId,
                description: product.name,
                quantity: Number(item.quantity || 0),
                unitPrice: Number(item.unitPrice || 0),
                barcode: product.barcode || null,
              };
            }),
            paymentMethod,
            total: Number(total || 0),
          })
        : null;

    let remainingNfeBalance = currentNfeBalance;
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          companyId,
          total,
          paymentMethod: finalPaymentMethod,
          cardType,
          cardInstallments:
            paymentMethod === "CREDITO"
              ? Math.max(Number(cardInstallments || 1), 1)
              : paymentMethod === "DEBITO"
                ? 1
                : null,
          cardMonthlyRate:
            paymentMethod === "CREDITO"
              ? Number(cardMonthlyRate || 0)
              : null,
          financingBank:
            paymentMethod === "FINANCIAMENTO"
              ? String(financingBank || "").trim() || null
              : null,
          financingEntry:
            paymentMethod === "FINANCIAMENTO"
              ? Number(financingEntry || 0)
              : null,
          financingInstallments:
            paymentMethod === "FINANCIAMENTO"
              ? Math.max(Number(financingInstallments || 0), 1)
              : null,
          financingMonthlyRate:
            paymentMethod === "FINANCIAMENTO"
              ? Number(financingMonthlyRate || 0)
              : null,
          financingTac:
            paymentMethod === "FINANCIAMENTO"
              ? Number(financingTac || 0)
              : null,
          financingIof:
            paymentMethod === "FINANCIAMENTO"
              ? Number(financingIof || 0)
              : null,
          financingInstallmentValue:
            paymentMethod === "FINANCIAMENTO"
              ? Number(financingInstallmentValue || 0)
              : null,
          financingFinancedAmount:
            paymentMethod === "FINANCIAMENTO"
              ? Number(financingFinancedAmount || 0)
              : null,
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
          customer: true,
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

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: {
            id: item.productId,
            companyId,
          },
          select: {
            id: true,
            category: true,
          },
        });

        if (!product) {
          continue;
        }

        if (product.category === "VEICULO") {
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: 0,
              vehicleStatus: "VENDIDO",
            },
          });
          continue;
        }

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      if (issueNfe && focusResult) {
        remainingNfeBalance = await registerSuccessfulNfeEmission(tx, {
          companyId,
          saleId: newSale.id,
          documentNumber: String(focusResult.documentNumber),
          amount: NFE_EMISSION_COST,
        });
      }

      return newSale;
    });

    return NextResponse.json(
      {
        ...sale,
        nfeIssued: Boolean(issueNfe),
        nfeCost: issueNfe ? NFE_EMISSION_COST : 0,
        remainingNfeBalance: issueNfe ? remainingNfeBalance : currentNfeBalance,
        nfeDocumentNumber: focusResult?.documentNumber || null,
        nfeAccessKey: focusResult?.accessKey || null,
        nfeStatus: focusResult?.status || null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FocusNfeError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          nfeBalance: currentNfeBalance,
          requiredAmount: NFE_EMISSION_COST,
        },
        { status: error.status },
      );
    }

    console.error("Erro ao processar venda:", error);
    return NextResponse.json(
      { error: "Erro ao processar venda" },
      { status: 500 },
    );
  }
}
