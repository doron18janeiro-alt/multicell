import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = currentUser.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const saleItems = await tx.saleItem.deleteMany({
        where: {
          sale: {
            companyId,
          },
        },
      });

      const productBatches = await tx.productBatch.deleteMany({
        where: {
          product: {
            companyId,
          },
        },
      });

      const sales = await tx.sale.deleteMany({
        where: {
          companyId,
        },
      });

      const serviceOrders = await tx.serviceOrder.deleteMany({
        where: {
          companyId,
        },
      });

      const products = await tx.product.deleteMany({
        where: {
          companyId,
        },
      });

      const expenses = await tx.expense.deleteMany({
        where: {
          companyId,
        },
      });

      return {
        companyId,
        saleItems: saleItems.count,
        productBatches: productBatches.count,
        sales: sales.count,
        serviceOrders: serviceOrders.count,
        products: products.count,
        expenses: expenses.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Base operacional da empresa resetada com sucesso.",
      result,
    });
  } catch (error) {
    console.error("[api/dev/reset-db][POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao resetar a base operacional." },
      { status: 500 },
    );
  }
}
