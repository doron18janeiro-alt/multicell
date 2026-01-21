import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await props.params; // Correção para Next.js 15+
    const body = await req.json();

    const quantity = Number(body.addedQuantity);
    const costPrice = Number(body.newCostPrice);
    const salePrice = Number(body.newSalePrice);

    if (isNaN(quantity) || isNaN(costPrice) || isNaN(salePrice)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 1. Busca dados atuais do produto para o cálculo
    const currentProduct = await prisma.product.findUnique({ where: { id } });
    if (!currentProduct)
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );

    const currentStock = Number(currentProduct.stock || 0);
    const currentCost = Number(currentProduct.costPrice || 0);

    // 2. Cálculo do Custo Médio Ponderado
    const totalStock = currentStock + quantity;
    let averageCost = costPrice;

    if (totalStock > 0) {
      averageCost =
        (currentStock * currentCost + quantity * costPrice) / totalStock;
    }

    // 3. Atualização e Registro Histórico em Transação
    const result = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: {
          stock: totalStock,
          costPrice: averageCost,
          salePrice: salePrice,
        },
      }),
      prisma.productBatch.create({
        data: {
          productId: id,
          quantity: quantity,
          costPrice: costPrice,
          salePrice: salePrice,
        },
      }),
    ]);

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("[BATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
