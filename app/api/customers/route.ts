import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: { companyId: session.user.companyId },
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
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, document } = body;

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        document,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
