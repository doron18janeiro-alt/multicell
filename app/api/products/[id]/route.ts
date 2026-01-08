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
        salePrice: parseFloat(String(price).replace(",", ".") || "0") || 0,
        costPrice: parseFloat(String(costPrice).replace(",", ".") || "0") || 0,
        category,
        stock: parseInt(String(stockQuantity) || "0"),
        minQuantity: parseInt(String(minQuantity) || "2") || 2,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto" },
      { status: 500 }
    );
  }
}
