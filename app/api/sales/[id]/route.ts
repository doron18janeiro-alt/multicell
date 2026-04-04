import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createAuditLog,
  formatAuditCurrency,
  formatAuditDateTime,
  getAuditActorName,
} from "@/lib/audit";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const saleId = Number.parseInt(id, 10);

    if (!Number.isFinite(saleId)) {
      return NextResponse.json({ error: "Venda invalida." }, { status: 400 });
    }

    const actorName = getAuditActorName(currentUser);

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          id: saleId,
          companyId: currentUser.companyId,
        },
        include: {
          items: true,
        },
      });

      if (!sale) {
        throw new Error("Venda não encontrada");
      }

      for (const item of sale.items) {
        if (!item.productId) {
          continue;
        }

        try {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              category: true,
            },
          });

          if (!product) {
            console.warn(
              `Produto ID ${item.productId} não encontrado. Ignorando estorno de estoque.`,
            );
            continue;
          }

          await tx.product.update({
            where: { id: item.productId },
            data:
              product.category === "VEICULO"
                ? {
                    stock: 1,
                    vehicleStatus: "DISPONIVEL",
                  }
                : {
                    stock: { increment: item.quantity },
                  },
          });
        } catch (stockError) {
          console.error(
            `Erro ao estornar estoque para o item ${item.id}:`,
            stockError,
          );
        }
      }

      await tx.saleItem.deleteMany({
        where: { saleId },
      });

      await tx.sale.delete({
        where: { id: saleId },
      });

      await createAuditLog(tx, {
        companyId: currentUser.companyId,
        userName: actorName,
        action: "DELETE",
        tableName: "sales",
        description: `${actorName} excluiu a venda #${sale.id} de ${formatAuditCurrency(sale.total)} criada em ${formatAuditDateTime(sale.createdAt)}.`,
      });
    });

    return NextResponse.json({
      message: "Venda excluída e estornada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao excluir venda" },
      { status: 500 },
    );
  }
}
