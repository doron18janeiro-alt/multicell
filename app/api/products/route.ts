import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { normalizeBarcode } from "@/lib/barcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const barcode = normalizeBarcode(searchParams.get("barcode"));

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = {
      companyId: currentUser.companyId,
    };

    if (category && category !== "TODOS") {
      where.category = category;
    }

    if (barcode) {
      where.barcode = barcode;
    } else if (search) {
      const normalizedSearch = normalizeBarcode(search);
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
        { barcode: { contains: search, mode: "insensitive" } },
        ...(normalizedSearch ? [{ barcode: normalizedSearch }] : []),
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
    console.error("Erro ao buscar produtos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      currentUser.role !== "ADMIN" &&
      currentUser.role !== "ATTENDANT"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      barcode,
    } = body;

    const normalizedBarcode = normalizeBarcode(barcode);

    if (normalizedBarcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          companyId: currentUser.companyId,
          barcode: normalizedBarcode,
        },
        select: { id: true },
      });

      if (existingBarcode) {
        return NextResponse.json(
          { error: "Já existe um produto com este código de barras." },
          { status: 409 },
        );
      }
    }

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
        barcode: normalizedBarcode || null,
        companyId: currentUser.companyId,
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
