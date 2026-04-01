import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isProductLowStock, resolveProductMinStock } from "@/lib/stock-alerts";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const detailed = searchParams.get("detailed") === "1";

    const products = await prisma.product.findMany({
      where: {
        companyId: currentUser.companyId,
        ...(productId ? { id: productId } : {}),
      },
      select: {
        id: true,
        name: true,
        stock: true,
        minStock: true,
        minQuantity: true,
        supplier: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            contact: true,
          },
        },
      },
    });

    const lowStockItems = products
      .filter((product) => isProductLowStock(product))
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        minStock: resolveProductMinStock(product),
        supplier: product.supplier
          ? {
              id: product.supplier.id,
              name: product.supplier.name,
              whatsapp: product.supplier.whatsapp,
              contact: product.supplier.contact,
            }
          : null,
      }));

    if (productId) {
      return NextResponse.json({
        item: lowStockItems[0] || null,
        count: lowStockItems.length,
      });
    }

    if (detailed) {
      return NextResponse.json({ count: lowStockItems.length, items: lowStockItems });
    }

    return NextResponse.json({ count: lowStockItems.length });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar alertas" }, { status: 500 });
  }
}
