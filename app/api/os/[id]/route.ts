import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.serviceOrder.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true },
    });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar O.S." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, technicalReport, totalPrice, costPrice, paymentMethod } =
      body;

    const data: any = {};
    if (status) data.status = status;
    if (technicalReport) data.observations = technicalReport;
    if (totalPrice !== undefined) data.totalPrice = parseFloat(totalPrice);
    if (costPrice !== undefined) data.costPrice = parseFloat(costPrice);
    if (paymentMethod) data.paymentMethod = paymentMethod;

    // Calcular lucro se tivermos os dois valores
    if (data.totalPrice !== undefined && data.costPrice !== undefined) {
      data.servicePrice = data.totalPrice - data.costPrice;
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id: parseInt(id) },
      data: data,
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao atualizar O.S." },
      { status: 500 }
    );
  }
}

// Manter PATCH por compatibilidade se algo usar
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}
