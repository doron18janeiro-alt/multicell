import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
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
  normalizeVehiclePlate,
} from "@/lib/segment-specialization";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const barcode = normalizeBarcode(searchParams.get("barcode"));
  const plate = normalizeVehiclePlate(
    searchParams.get("plate") || searchParams.get("licensePlate"),
  );
  const includeSold = searchParams.get("includeSold") === "1";

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = {
      companyId: currentUser.companyId,
    };

    if (!includeSold) {
      where.NOT = {
        AND: [
          { category: "VEICULO" },
          { vehicleStatus: "VENDIDO" },
        ],
      };
    }

    if (category && category !== "TODOS") {
      where.category = category;
    }

    if (barcode) {
      where.barcode = barcode;
    } else if (plate) {
      where.vehiclePlate = plate;
    } else if (search) {
      const normalizedSearch = normalizeBarcode(search);
      const normalizedPlate = normalizeVehiclePlate(search);
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
        { barcode: { contains: search, mode: "insensitive" } },
        { vehicleBrand: { contains: search, mode: "insensitive" } },
        { vehicleModel: { contains: search, mode: "insensitive" } },
        { vehicleColor: { contains: search, mode: "insensitive" } },
        { vehicleCondition: { contains: search, mode: "insensitive" } },
        { vehicleSinisterHistory: { contains: search, mode: "insensitive" } },
        { vehiclePlate: { contains: search, mode: "insensitive" } },
        { vehicleChassis: { contains: search, mode: "insensitive" } },
        ...(Number.isFinite(Number(search))
          ? [{ vehicleMileage: Number.parseInt(search, 10) }]
          : []),
        ...(normalizedSearch ? [{ barcode: normalizedSearch }] : []),
        ...(normalizedPlate ? [{ vehiclePlate: normalizedPlate }] : []),
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            contact: true,
          },
        },
      },
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
      currentUser.role !== "ATTENDANT" &&
      currentUser.role !== "FUNCIONARIO"
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
    const parsedMinQuantity = parseInt(minQuantity?.toString() || "2") || 2;
    const vehicleProfile = normalizeVehicleProfileInput(body);

    const normalizedBarcode = normalizeBarcode(barcode);
    const vehicleValidationError = validateVehicleProfile(category, vehicleProfile);

    if (vehicleValidationError) {
      return NextResponse.json({ error: vehicleValidationError }, { status: 400 });
    }

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

    const duplicateVehicleWhere = buildVehicleDuplicateWhere(
      currentUser.companyId,
      vehicleProfile,
    );

    if (duplicateVehicleWhere) {
      const duplicateVehicle = await prisma.product.findFirst({
        where: duplicateVehicleWhere,
        select: {
          id: true,
          vehiclePlate: true,
          vehicleChassis: true,
          vehicleRenavam: true,
        },
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
    const parsedStockQuantity = parseInt(stockQuantity?.toString() || "0", 10) || 0;
    const parsedSalePrice = parseBRLCurrencyInput(price);
    const parsedCostPrice = parseBRLCurrencyInput(costPrice);

    const product = await prisma.product.create({
      data: {
        name,
        salePrice: parsedSalePrice,
        costPrice: parsedCostPrice,
        category,
        stock: isVehicleCategory(category) ? vehicleStock : parsedStockQuantity,
        minQuantity: isVehicleCategory(category) ? 0 : parsedMinQuantity,
        minStock: isVehicleCategory(category) ? 0 : parsedMinQuantity,
        supplierId: supplierId || null,
        barcode: normalizedBarcode || null,
        companyId: currentUser.companyId,
        ...buildVehicleProductData(category, vehicleProfile),
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
