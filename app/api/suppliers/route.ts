import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar fornecedores" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contact, whatsapp, catalogUrl } = body;

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contact,
        whatsapp,
        catalogUrl,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar fornecedor" },
      { status: 500 }
    );
  }
}
