import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const RESET_SECRET = String(process.env.DEV_RESET_SECRET || "").trim();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();

export async function POST(request: Request) {
  try {
    if (!RESET_SECRET) {
      return NextResponse.json(
        { error: "DEV_RESET_SECRET nao configurado no ambiente." },
        { status: 503 },
      );
    }

    if (!ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "ADMIN_EMAIL nao configurado no ambiente." },
        { status: 503 },
      );
    }

    const providedSecret = String(
      request.headers.get("x-admin-secret") || "",
    ).trim();

    if (!providedSecret || providedSecret !== RESET_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const saleItems = await tx.saleItem.deleteMany({ where: {} });
      const productBatches = await tx.productBatch.deleteMany({ where: {} });

      const sales = await tx.sale.deleteMany({ where: {} });
      const products = await tx.product.deleteMany({ where: {} });
      const serviceOrders = await tx.serviceOrder.deleteMany({ where: {} });
      const expenses = await tx.expense.deleteMany({ where: {} });
      const customers = await tx.customer.deleteMany({ where: {} });
      const nfeLogs = await tx.nfeLog.deleteMany({ where: {} });

      const companies = await tx.company.updateMany({
        data: {
          logoUrl: null,
          name: "World Tech Manager",
          nfeBalance: 0,
        },
      });

      const companyConfigs = await tx.companyConfig.updateMany({
        data: {
          logoUrl: null,
          name: "World Tech Manager",
        },
      });

      const users = await tx.user.deleteMany({
        where: {
          NOT: {
            email: ADMIN_EMAIL,
          },
        },
      });

      return {
        saleItems: saleItems.count,
        productBatches: productBatches.count,
        sales: sales.count,
        products: products.count,
        serviceOrders: serviceOrders.count,
        expenses: expenses.count,
        customers: customers.count,
        nfeLogs: nfeLogs.count,
        companiesReset: companies.count,
        companyConfigsReset: companyConfigs.count,
        usersRemoved: users.count,
        preservedAdminEmail: ADMIN_EMAIL,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Ecossistema WTM resetado com sucesso.",
      result,
    });
  } catch (error) {
    console.error("[api/dev/reset-db][POST] Error:", error);
    return NextResponse.json(
      { error: "Erro ao resetar a base do World Tech Manager." },
      { status: 500 },
    );
  }
}
