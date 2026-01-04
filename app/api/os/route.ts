import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Listar todas as O.S.
export async function GET() {
  try {
    const orders = await prisma.serviceOrder.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        entryDate: "desc",
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar ordens de serviço" },
      { status: 500 }
    );
  }
}

// POST: Criar nova O.S.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientPhone,
      clientDocument,
      deviceBrand,
      deviceModel,
      imei,
      passcode,
      clientReport,
      checklist,
    } = body;

    // 1. Busca ou cria o cliente
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [{ document: clientDocument }, { phone: clientPhone }],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: clientName,
          phone: clientPhone,
          document: clientDocument,
        },
      });
    }

    // 2. Cria a Ordem de Serviço
    const newOrder = await prisma.serviceOrder.create({
      data: {
        customerId: customer.id,
        brand: deviceBrand,
        model: deviceModel,
        imei: imei,
        passcode: passcode,
        description: clientReport,
        checklist: JSON.stringify(checklist),
        status: "ABERTO",
      },
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao criar ordem de serviço" },
      { status: 500 }
    );
  }
}
