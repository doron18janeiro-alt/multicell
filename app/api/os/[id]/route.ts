import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, technicalReport, price } = body;

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id: parseInt(id) },
      data: {
        status,
        technicalReport,
        price: price ? parseFloat(price) : undefined,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar O.S." },
      { status: 500 }
    );
  }
}
