import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, document } = body;

    const customer = await prisma.customer.update({
      where: { id: id },
      data: {
        name,
        phone,
        document,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar cliente" },
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

    // Check for related records
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            serviceOrders: true,
            // sales: true, // If sales have customer relation. For now assuming SO.
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (customer._count.serviceOrders > 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir cliente com Ordens de Serviço vinculadas.",
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Cliente excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cliente" },
      { status: 500 }
    );
  }
}
