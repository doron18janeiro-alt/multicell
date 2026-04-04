import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { normalizeBarcode } from "@/lib/barcode";
import { parseBRLCurrencyInput } from "@/lib/currency";
import {
  buildVehicleDuplicateWhere,
  buildVehicleProductData,
  normalizeVehicleProfileInput,
  validateVehicleProfile,
} from "@/lib/vehicle-product";
import {
  isVehicleCategory,
  normalizeVehicleInventoryStatus,
} from "@/lib/segment-specialization";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fix for Next.js 16
    const { id } = await params;
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
    const parsedMinQuantity = parseInt(String(minQuantity) || "2") || 2;
    const normalizedBarcode = normalizeBarcode(barcode);
    const vehicleProfile = normalizeVehicleProfileInput(body);
    const vehicleValidationError = validateVehicleProfile(category, vehicleProfile);

    if (vehicleValidationError) {
      return NextResponse.json({ error: vehicleValidationError }, { status: 400 });
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    }

    if (normalizedBarcode) {
      const duplicateBarcode = await prisma.product.findFirst({
        where: {
          companyId: currentUser.companyId,
          barcode: normalizedBarcode,
          NOT: {
            id: existingProduct.id,
          },
        },
        select: { id: true },
      });

      if (duplicateBarcode) {
        return NextResponse.json(
          { error: "Já existe um produto com este código de barras." },
          { status: 409 },
        );
      }
    }

    const duplicateVehicleWhere = buildVehicleDuplicateWhere(
      currentUser.companyId,
      vehicleProfile,
      existingProduct.id,
    );

    if (duplicateVehicleWhere) {
      const duplicateVehicle = await prisma.product.findFirst({
        where: duplicateVehicleWhere,
        select: { id: true },
      });

      if (duplicateVehicle) {
        return NextResponse.json(
          {
            error:
              "Já existe um veículo cadastrado com a mesma placa, chassi ou renavam.",
          },
          { status: 409 },
        );
      }
    }

    const normalizedVehicleStatus =
      normalizeVehicleInventoryStatus(vehicleProfile.status) || "DISPONIVEL";
    const vehicleStock = normalizedVehicleStatus === "VENDIDO" ? 0 : 1;
    const parsedStockQuantity = parseInt(String(stockQuantity) || "0", 10) || 0;

    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        name,
        salePrice: parseBRLCurrencyInput(price),
        costPrice: parseBRLCurrencyInput(costPrice),
        category,
        stock: isVehicleCategory(category) ? vehicleStock : parsedStockQuantity,
        minQuantity: isVehicleCategory(category) ? 0 : parsedMinQuantity,
        minStock: isVehicleCategory(category) ? 0 : parsedMinQuantity,
        supplierId: supplierId || null,
        barcode: normalizedBarcode || null,
        ...buildVehicleProductData(category, vehicleProfile),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    }

    await prisma.product.delete({
      where: { id: existingProduct.id },
    });

    return NextResponse.json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto" },
      { status: 500 }
    );
  }
}
