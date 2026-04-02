import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const scopedCustomerWhere = (id: string, companyId: string) => ({
  id,
  companyId,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
      where: scopedCustomerWhere(id, currentUser.companyId),
      include: {
        sales: {
          where: {
            companyId: currentUser.companyId,
          },
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        serviceOrders: {
          where: {
            companyId: currentUser.companyId,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Erro ao buscar detalhes do cliente:", error);
    return NextResponse.json(
      { error: "Erro ao buscar detalhes do cliente" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, document, birthDate } = body;

    const existingCustomer = await prisma.customer.findFirst({
      where: scopedCustomerWhere(id, currentUser.companyId),
      select: { id: true },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    const customer = await prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        name,
        phone,
        document,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cliente" },
      { status: 500 },
    );
  }
}

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

    const customer = await prisma.customer.findFirst({
      where: scopedCustomerWhere(id, currentUser.companyId),
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    await prisma.customer.delete({
      where: { id: customer.id },
    });

    return NextResponse.json({ message: "Cliente excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cliente" },
      { status: 500 },
    );
  }
}
