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
        createdAt: "desc",
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
      totalPrice
    } = body;

    // 1. Busca ou cria o cliente (Opcional se quisermos manter vinculo forte)
    // No novo schema customerId é opcional, mas vamos tentar vincular
    let customerId = null; 
    let customer = await prisma.customer.findFirst({
        where: {
            OR: [
                { document: clientDocument || undefined }, // undefined to avoid matching nulls if empty
                { phone: clientPhone }
            ]
        }
    });

    if (customer) {
        customerId = customer.id;
    } else if (clientName && clientPhone) {
        // Create customer if basic info present
        const newCustomer = await prisma.customer.create({
            data: {
                name: clientName,
                phone: clientPhone,
                document: clientDocument || null
            }
        });
        customerId = newCustomer.id;
    }

    // 2. Cria a O.S.
    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        clientName,
        clientPhone,
        clientCpf: clientDocument,
        deviceBrand,
        deviceModel,
        serialNumber: imei, // Mapeando imei para serialNumber
        devicePassword: passcode, // Mapeando passcode para devicePassword
        problem: clientReport || "Não informado", // Mapeando clientReport para problem
        checklist: checklist || {},
        totalPrice: totalPrice ? parseFloat(totalPrice) : 0,
        customerId: customerId,
        status: "ABERTO"
      },
    });

    return NextResponse.json(serviceOrder, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao criar ordem de serviço" },
      { status: 500 }
    );
  }
}
