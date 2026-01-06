import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const document = searchParams.get("document");

  if (!id || !document) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  try {
    const order = await prisma.serviceOrder.findFirst({
      where: {
        osNumber: parseInt(id),
        customer: {
          document: document,
        },
      },
      select: {
        status: true,
        deviceModel: true,
        deviceBrand: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Ordem de Serviço não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar status" },
      { status: 500 }
    );
  }
}
