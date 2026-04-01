import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    }

    const product = await prisma.product.update({
      where: { id: existingProduct.id },
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    }

    await prisma.product.delete({
      where: { id: existingProduct.id },
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
