import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        serviceOrders: {
          select: { status: true },
        },
      },
    });
    // Transform to include count for compatibility if needed, though frontend can use .length
    const formattedCustomers = customers.map((c) => ({
      ...c,
      _count: { serviceOrders: c.serviceOrders.length },
    }));
    return NextResponse.json(formattedCustomers);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, document } = body;

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        document,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
