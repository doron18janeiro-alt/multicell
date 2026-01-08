import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    const where: any = {};

    if (category && category !== "TODOS") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } }, // SQLite is case-sensitive by default, but Prisma usually handles it or we might need raw query for case-insensitive if needed. For now, simple contains.
        // Add barcode search if we had a barcode field, but we don't in the schema yet. Using ID or Name.
        { id: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}
