import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check if there are any products with stock <= minQuantity
    // Since we can't easily do field comparison in 'where', we fetch minimal data
    const products = await prisma.product.findMany({
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
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
