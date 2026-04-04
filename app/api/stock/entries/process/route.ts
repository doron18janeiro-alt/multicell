import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { normalizeBarcode } from "@/lib/barcode";
import { parseBRLCurrencyInput } from "@/lib/currency";
import { baixarXmlNfeRecebidaPorChave } from "@/lib/focus-nfe";
import { prisma } from "@/lib/prisma";
import { isVehicleCategory } from "@/lib/segment-specialization";
import type {
  StockEntryPreview,
  StockEntryPreviewItem,
  StockEntryProcessItemInput,
} from "@/lib/stock-entry-types";

const normalizeDigits = (value: string | null | undefined) =>
  String(value || "")
    .replace(/\D+/g, "")
    .trim();

const roundMoney = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const resolveStockQuantity = (item: StockEntryPreviewItem, category: string) => {
  if (isVehicleCategory(category)) {
    return 1;
  }

  return Math.max(1, Number(item.stockQuantity || 0) || Math.ceil(item.quantity || 0));
};

const resolveDueDate = (value: string | null | undefined, fallback?: string | null) => {
  const candidate = String(value || fallback || "").trim();

  if (!candidate) {
    return new Date();
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const preview = (body.preview || null) as StockEntryPreview | null;
    const items = Array.isArray(body.items)
      ? (body.items as StockEntryProcessItemInput[])
      : [];

    if (!preview || !Array.isArray(preview.items) || preview.items.length === 0) {
      return NextResponse.json(
        { error: "A previa da nota nao foi informada corretamente." },
        { status: 400 },
      );
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const accessKey = normalizeDigits(preview.accessKey);
    let resolvedXmlContent = String(body.xmlContent || "").trim();

    if (!resolvedXmlContent && accessKey && preview.xmlSource === "focus") {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          companyData: true,
          certificateA1: true,
        },
      });

      if (company) {
        resolvedXmlContent = await baixarXmlNfeRecebidaPorChave({
          accessKey,
          companyData: company.companyData,
          certificateA1: company.certificateA1,
        });
      }
    }

    if (accessKey) {
      const existingEntry = await prisma.stockEntry.findFirst({
        where: {
          companyId,
          accessKey,
        },
        select: {
          id: true,
        },
      });

      if (existingEntry) {
        return NextResponse.json(
          { error: "Esta NF-e ja foi processada anteriormente." },
          { status: 409 },
        );
      }
    }

    const itemConfigMap = new Map(items.map((item) => [item.id, item]));
    const existingProductIds = Array.from(
      new Set(
        items
          .map((item) => String(item.existingProductId || "").trim())
          .filter(Boolean),
      ),
    );
    const existingProducts = existingProductIds.length
      ? await prisma.product.findMany({
          where: {
            companyId,
            id: {
              in: existingProductIds,
            },
          },
          select: {
            id: true,
            name: true,
            barcode: true,
            ncm: true,
            category: true,
            stock: true,
            costPrice: true,
            salePrice: true,
            vehicleStatus: true,
            vehicleChassis: true,
            vehicleEngine: true,
            vehicleManufactureYear: true,
            vehicleModelYear: true,
            vehicleColor: true,
          },
        })
      : [];
    const existingProductMap = new Map(
      existingProducts.map((product) => [product.id, product]),
    );

    const processed = await prisma.$transaction(async (tx) => {
      const stockEntry = await tx.stockEntry.create({
        data: {
          companyId,
          sourceType: preview.sourceMethod,
          status: "PROCESSED",
          accessKey: accessKey || null,
          invoiceNumber: preview.invoiceNumber,
          series: preview.series,
          supplierName: preview.supplierName,
          supplierDocument: normalizeDigits(preview.supplierDocument) || null,
          issueDate: preview.issueDate ? new Date(preview.issueDate) : null,
          productsTotal: preview.productsTotal,
          freightAmount: preview.freightAmount,
          discountAmount: preview.discountAmount,
          totalAmount: preview.totalAmount,
          xmlContent: resolvedXmlContent || null,
          rawData: preview as Prisma.InputJsonValue,
        },
      });

      let createdCount = 0;
      let updatedCount = 0;

      for (const previewItem of preview.items) {
        const config = itemConfigMap.get(previewItem.id);
        const action = config?.action || previewItem.suggestedAction;
        const category = String(
          config?.category || previewItem.suggestedCategory,
        )
          .trim()
          .toUpperCase();
        const stockQuantity = resolveStockQuantity(previewItem, category);
        const normalizedBarcode =
          normalizeBarcode(config?.barcode || previewItem.barcode || "") || null;
        const normalizedNcm =
          normalizeDigits(config?.ncm || previewItem.ncm || "") || null;
        const costPrice =
          parseBRLCurrencyInput(config?.costPrice) || Number(previewItem.unitCost || 0);
        const salePrice =
          parseBRLCurrencyInput(config?.salePrice) || costPrice;
        const itemName = String(config?.name || previewItem.description || "").trim();
        let linkedProductId: string | null = null;

        if (action === "UPDATE_EXISTING") {
          const existingProductId = String(config?.existingProductId || "").trim();
          const existingProduct = existingProductMap.get(existingProductId);

          if (!existingProduct) {
            throw new Error(
              `Produto vinculado nao encontrado para o item ${previewItem.description}.`,
            );
          }

          const nextStock = isVehicleCategory(existingProduct.category)
            ? Math.max(Number(existingProduct.stock || 0), 0) + stockQuantity
            : Number(existingProduct.stock || 0) + stockQuantity;
          const nextAverageCost = roundMoney(
            (Number(existingProduct.stock || 0) * Number(existingProduct.costPrice || 0) +
              stockQuantity * costPrice) /
              Math.max(nextStock, 1),
          );

          await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              stock: nextStock,
              costPrice: nextAverageCost,
              salePrice: salePrice || Number(existingProduct.salePrice || 0),
              ncm: existingProduct.ncm || normalizedNcm,
              ...(isVehicleCategory(existingProduct.category)
                ? {
                    vehicleStatus: "DISPONIVEL",
                    vehicleChassis:
                      existingProduct.vehicleChassis ||
                      previewItem.vehicle?.chassis ||
                      null,
                    vehicleEngine:
                      existingProduct.vehicleEngine ||
                      previewItem.vehicle?.engine ||
                      null,
                    vehicleManufactureYear:
                      existingProduct.vehicleManufactureYear ||
                      previewItem.vehicle?.manufactureYear ||
                      null,
                    vehicleModelYear:
                      existingProduct.vehicleModelYear ||
                      previewItem.vehicle?.modelYear ||
                      null,
                    vehicleColor:
                      existingProduct.vehicleColor || previewItem.vehicle?.color || null,
                  }
                : {}),
            },
          });

          await tx.productBatch.create({
            data: {
              productId: existingProduct.id,
              quantity: stockQuantity,
              costPrice,
              salePrice: salePrice || Number(existingProduct.salePrice || 0),
            },
          });

          linkedProductId = existingProduct.id;
          updatedCount += 1;
        }

        if (action === "CREATE_NEW") {
          if (normalizedBarcode) {
            const duplicateBarcode = await tx.product.findFirst({
              where: {
                companyId,
                barcode: normalizedBarcode,
              },
              select: {
                id: true,
              },
            });

            if (duplicateBarcode) {
              throw new Error(
                `Ja existe um produto com o codigo ${normalizedBarcode}. Vincule o item ao cadastro existente.`,
              );
            }
          }

          const product = await tx.product.create({
            data: {
              companyId,
              name: itemName || previewItem.description,
              barcode: normalizedBarcode,
              ncm: normalizedNcm,
              category,
              costPrice,
              salePrice,
              stock: isVehicleCategory(category) ? 1 : stockQuantity,
              minQuantity: isVehicleCategory(category) ? 0 : 2,
              minStock: isVehicleCategory(category) ? 0 : 2,
              ...(isVehicleCategory(category)
                ? {
                    vehicleStatus: "DISPONIVEL",
                    vehicleCondition: "NOVO",
                    vehicleChassis: previewItem.vehicle?.chassis || null,
                    vehicleEngine: previewItem.vehicle?.engine || null,
                    vehicleManufactureYear:
                      previewItem.vehicle?.manufactureYear || null,
                    vehicleModelYear: previewItem.vehicle?.modelYear || null,
                    vehicleColor: previewItem.vehicle?.color || null,
                    vehicleAdditionalInfo: previewItem.additionalInfo || null,
                  }
                : {}),
            },
          });

          await tx.productBatch.create({
            data: {
              productId: product.id,
              quantity: isVehicleCategory(category) ? 1 : stockQuantity,
              costPrice,
              salePrice,
            },
          });

          linkedProductId = product.id;
          createdCount += 1;
        }

        await tx.stockEntryItem.create({
          data: {
            stockEntryId: stockEntry.id,
            productId: linkedProductId,
            action,
            description: itemName || previewItem.description,
            internalCode: previewItem.internalCode,
            barcode: normalizedBarcode,
            ncm: normalizedNcm,
            cfop: previewItem.cfop,
            unit: previewItem.unit,
            quantity: previewItem.quantity,
            unitCost: costPrice,
            totalCost: roundMoney(costPrice * Number(previewItem.quantity || 0)),
            selectedCategory: category,
            vehicleChassis: previewItem.vehicle?.chassis || null,
            vehicleEngine: previewItem.vehicle?.engine || null,
            vehicleYear:
              previewItem.vehicle?.modelYear || previewItem.vehicle?.manufactureYear || null,
            rawData: {
              previewItem,
              config,
            } as Prisma.InputJsonValue,
          },
        });
      }

      const payables =
        preview.installments.length > 0
          ? preview.installments
          : [
              {
                id: "1",
                number: null,
                dueDate: preview.issueDate,
                amount: Number(preview.totalAmount || 0),
              },
            ];

      for (const payable of payables) {
        if (Number(payable.amount || 0) <= 0) {
          continue;
        }

        await tx.expense.create({
          data: {
            companyId,
            stockEntryId: stockEntry.id,
            description: `NF-e ${preview.invoiceNumber || "sem numero"}${preview.series ? `/${preview.series}` : ""} - ${preview.supplierName || "Fornecedor"}`,
            category: "COMPRA_ESTOQUE",
            type: "SHOP",
            amount: roundMoney(Number(payable.amount || 0)),
            dueDate: resolveDueDate(payable.dueDate, preview.issueDate),
            isRecurring: false,
            status: "PENDING",
          },
        });
      }

      return {
        id: stockEntry.id,
        invoiceNumber: stockEntry.invoiceNumber,
        accessKey: stockEntry.accessKey,
        createdCount,
        updatedCount,
        payablesCount: payables.filter((payable) => Number(payable.amount || 0) > 0)
          .length,
      };
    });

    return NextResponse.json({
      message: "Entrada processada com sucesso.",
      ...processed,
    });
  } catch (error) {
    console.error("[stock][entries][process] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar a entrada da nota.",
      },
      { status: 500 },
    );
  }
}
