import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser) || !currentUser.isDeveloper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const saleItems = await tx.saleItem.deleteMany({
        where: {},
      });

      const productBatches = await tx.productBatch.deleteMany({
        where: {},
      });

      const sales = await tx.sale.deleteMany({
        where: {},
      });

      const serviceOrders = await tx.serviceOrder.deleteMany({
        where: {},
      });

      const products = await tx.product.deleteMany({
        where: {},
      });

      const expenses = await tx.expense.deleteMany({
        where: {},
      });

      const customers = await tx.customer.deleteMany({
        where: {},
      });

      return {
        saleItems: saleItems.count,
        productBatches: productBatches.count,
        sales: sales.count,
        serviceOrders: serviceOrders.count,
        products: products.count,
        expenses: expenses.count,
        customers: customers.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Base operacional do World Tech Manager resetada com sucesso.",
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
