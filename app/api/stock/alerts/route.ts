import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if there are any products with stock <= minQuantity
    // Since we can't easily do field comparison in 'where', we fetch minimal data
    const products = await prisma.product.findMany({
      where: {
        companyId: currentUser.companyId,
      },
      select: {
        stock: true,
        minQuantity: true,
      },
    });

    const lowStockCount = products.filter(
      (p) => p.stock <= p.minQuantity
    ).length;

    return NextResponse.json({ count: lowStockCount });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar alertas" }, { status: 500 });
  }
}
