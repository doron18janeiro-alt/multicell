import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, paymentMethod, total } = body;

    // Transaction to ensure data consistency
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create the Sale
      const newSale = await tx.sale.create({
        data: {
          total,
          paymentMethod,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. Update Stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Erro ao processar venda:", error);
    return NextResponse.json(
      { error: "Erro ao processar venda" },
      { status: 500 }
    );
  }
}
