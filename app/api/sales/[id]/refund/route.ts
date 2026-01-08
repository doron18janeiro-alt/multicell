import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const saleId = parseInt(id);
    const body = await request.json();
    const { reason } = body;

    // 1. Transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get the sale and its items
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      if (!sale) {
        throw new Error("Venda não encontrada");
      }

      if (sale.status === "REFUNDED") {
        throw new Error("Venda já estornada");
      }

      // Update sale status
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "REFUNDED",
          returnReason: reason,
        },
      });

      // Restore stock for each item
      for (const item of sale.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      return sale;
    });

    return NextResponse.json({
      message: "Venda estornada com sucesso",
      sale: result,
    });
  } catch (error: any) {
    console.error("Erro ao estornar venda:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar estorno" },
      { status: 500 }
    );
  }
}
