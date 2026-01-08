import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE: Deletes a sale and refunds stock/financials (Reverse operation)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const saleId = parseInt(id);

    // 1. Transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // Fetch sale with items
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      if (!sale) {
        throw new Error("Venda não encontrada");
      }

      // 2. Restore Stock
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      // 3. Delete the sale (Cascade delete items usually, but let's be safe)
      // If schema has onDelete: Cascade, items go with it.
      await tx.saleItem.deleteMany({
        where: { saleId: saleId },
      });

      await tx.sale.delete({
        where: { id: saleId },
      });
    });

    return NextResponse.json({
      message: "Venda excluída e estornada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao excluir venda" },
      { status: 500 }
    );
  }
}
