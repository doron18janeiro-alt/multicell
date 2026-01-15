import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.serviceOrder.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true },
    });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar O.S." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, technicalReport, totalPrice, costPrice, paymentMethod } =
      body;

    const data: any = {};
    if (status) data.status = status;
    if (technicalReport) data.observations = technicalReport;
    if (totalPrice !== undefined) data.totalPrice = parseFloat(totalPrice);
    if (costPrice !== undefined) data.costPrice = parseFloat(costPrice);
    if (paymentMethod) data.paymentMethod = paymentMethod;

    // Calcular lucro se tivermos os dois valores
    if (data.totalPrice !== undefined && data.costPrice !== undefined) {
      data.servicePrice = data.totalPrice - data.costPrice;
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id: parseInt(id) },
      data: data,
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao atualizar O.S." },
      { status: 500 }
    );
  }
}

// Manter PATCH por compatibilidade se algo usar
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const osId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      // 1. Buscar Vendas vinculadas a esta OS (para evitar erro de FK e estornar estoque)
      // O campo serviceOrderId existe no modelo Sale
      const linkedSales = await tx.sale.findMany({
        where: { serviceOrderId: osId },
        include: { items: true },
      });

      // 2. Processar exclusão das vendas vinculadas
      for (const sale of linkedSales) {
        // 2.1 Estornar Estoque (Resiliente a falhas)
        for (const item of sale.items) {
          if (item.productId) {
            try {
              // Verifica existência antes do update
              const product = await tx.product.findUnique({
                where: { id: item.productId },
              });

              if (product) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stock: { increment: item.quantity },
                  },
                });
              } else {
                console.warn(
                  `[Delete OS] Produto ${item.productId} não encontrado. Ignorando estorno.`
                );
              }
            } catch (stockError) {
              console.error(
                `[Delete OS] Erro ao estornar item ${item.id}:`,
                stockError
              );
              // Continua mesmo com erro
            }
          }
        }

        // 2.2 Excluir Itens da Venda
        await tx.saleItem.deleteMany({
          where: { saleId: sale.id },
        });

        // 2.3 Excluir a Venda
        await tx.sale.delete({
          where: { id: sale.id },
        });
      }

      // 3. Excluir a Ordem de Serviço
      // Removemos validação de status. Exclui direto.
      await tx.serviceOrder.delete({
        where: { id: osId },
      });
    });

    return NextResponse.json({
      message: "Ordem de Serviço excluída com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir OS:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir OS: " + (error.message || "Erro desconhecido"),
      },
      { status: 500 }
    );
  }
}
