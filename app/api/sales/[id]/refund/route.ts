import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createAuditLog,
  formatAuditCurrency,
  getAuditActorName,
} from "@/lib/audit";

export async function POST(
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
    const body = await request.json();
    const reason = String(body.reason || "").trim();

    if (!Number.isFinite(saleId)) {
      return NextResponse.json({ error: "Venda invalida." }, { status: 400 });
    }

    const actorName = getAuditActorName(currentUser);

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          id: saleId,
          companyId: currentUser.companyId,
        },
        include: { items: true },
      });

      if (!sale) {
        throw new Error("Venda não encontrada");
      }

      if (sale.status === "REFUNDED") {
        throw new Error("Venda já estornada");
      }

      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "REFUNDED",
          returnReason: reason || null,
        },
      });

      for (const item of sale.items) {
        if (!item.productId) {
          continue;
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      await createAuditLog(tx, {
        companyId: currentUser.companyId,
        userName: actorName,
        action: "UPDATE",
        tableName: "sales",
        description: `${actorName} alterou a venda #${sale.id} de ${sale.status} para REFUNDED, no valor de ${formatAuditCurrency(sale.total)}${reason ? `. Motivo: ${reason}` : "."}`,
      });

      return updatedSale;
    });

    return NextResponse.json({
      message: "Venda estornada com sucesso",
      sale: result,
    });
  } catch (error: any) {
    console.error("Erro ao estornar venda:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar estorno" },
      { status: 500 },
    );
  }
}
