import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fix for Next.js 16
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      price,
      costPrice,
      category,
      stockQuantity,
      minQuantity,
      supplierId,
    } = body;

    const product = await prisma.product.update({
      where: { id: id },
      data: {
        name,
        salePrice: parseFloat(price),
        costPrice: parseFloat(costPrice),
        category,
        stock: parseInt(stockQuantity),
        minQuantity: parseInt(minQuantity) || 2,
        supplierId: supplierId || null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}
