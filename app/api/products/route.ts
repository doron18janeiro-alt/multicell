import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = {
      companyId: session.user.companyId,
    };

    if (category && category !== "TODOS") {
      where.category = category;
    }

    if (search) {
      where.OR = [{ name: { contains: search } }, { id: { contains: search } }];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
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
    const {
      name,
      price,
      costPrice,
      category,
      stockQuantity,
      minQuantity,
      supplierId,
    } = body;

    const product = await prisma.product.create({
      data: {
        name,
        salePrice: parseFloat(price?.toString() || "0") || 0,
        costPrice: parseFloat(costPrice?.toString() || "0") || 0,
        category,
        stock: parseInt(stockQuantity?.toString() || "0") || 0,
        minQuantity: parseInt(minQuantity?.toString() || "2") || 2,
        minStock: 5,
        supplierId: supplierId || null,
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}
