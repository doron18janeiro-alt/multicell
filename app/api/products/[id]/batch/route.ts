import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();

    // Convert inputs to numbers
    const addedQuantity = Number(body.addedQuantity);
    const newCostPrice = Number(body.newCostPrice);
    const newSalePrice = Number(body.newSalePrice);

    if (isNaN(addedQuantity) || isNaN(newCostPrice) || isNaN(newSalePrice)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    }

    // Weighted Average Cost Calculation
    const currentStock = Number(product.stock);
    const currentCost = Number(product.costPrice);

    // Formula: ((CurrentStock * CurrentCost) + (NewQty * NewCost)) / (CurrentStock + NewQty)
    const numerator = currentStock * currentCost + addedQuantity * newCostPrice;
    const denominator = currentStock + addedQuantity;

    let weightedAverageCost = newCostPrice;

    // Avoid division by zero
    if (denominator !== 0) {
      weightedAverageCost = numerator / denominator;
    }

    // Transaction to update product and create batch record
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Batch Record
      await tx.productBatch.create({
        data: {
          productId: id,
          quantity: addedQuantity,
          costPrice: newCostPrice,
          salePrice: newSalePrice,
        },
      });

      // 2. Update Product
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stock: { increment: addedQuantity },
          costPrice: weightedAverageCost,
          salePrice: newSalePrice,
        },
      });

      return updatedProduct;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing batch:", error);
    return NextResponse.json(
      { error: "Erro ao processar remessa" },
      { status: 500 },
    );
  }
}
