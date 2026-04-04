import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeVehiclePlate } from "@/lib/segment-specialization";

const normalizeCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

const buildVariants = (value: string, isAutoLookup = false) =>
  Array.from(
    new Set(
      [
        value.trim(),
        normalizeCode(value),
        isAutoLookup ? normalizeVehiclePlate(value) : "",
      ].filter(Boolean),
    ),
  );

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const diffInDays = (from: Date, to: Date) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((to.getTime() - from.getTime()) / msPerDay);
};

const buildWarrantyCoverageDescription = ({
  isAutoLookup,
  serviceOrderId,
  coveredParts,
}: {
  isAutoLookup: boolean;
  serviceOrderId: number | null;
  coveredParts: string[];
}) => {
  const normalizedParts = Array.from(
    new Set(
      coveredParts
        .map((part) => String(part || "").trim())
        .filter(Boolean),
    ),
  );

  if (isAutoLookup) {
    if (normalizedParts.length > 0) {
      return `A garantia cobre o serviço executado na O.S. #${serviceOrderId || "-"} e as peças efetivamente aplicadas: ${normalizedParts.join(", ")}. Não cobre mau uso, colisões, combustível inadequado, desgaste natural ou intervenções de terceiros.`;
    }

    return `A garantia cobre exclusivamente o serviço executado na O.S. #${serviceOrderId || "-"} e as peças efetivamente aplicadas nessa ordem. Não cobre mau uso, colisões, combustível inadequado, desgaste natural ou intervenções de terceiros.`;
  }

  if (normalizedParts.length > 0) {
    return `A garantia cobre o serviço executado e as peças aplicadas na O.S. #${serviceOrderId || "-"}: ${normalizedParts.join(", ")}. Não cobre quedas, contato com líquidos, oxidação, violação de lacre ou intervenção de terceiros.`;
  }

  return `A garantia cobre o serviço executado na O.S. #${serviceOrderId || "-"} e as peças efetivamente aplicadas nessa ordem. Não cobre mau uso, quedas, contato com líquidos, oxidação ou intervenção de terceiros.`;
};

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim() || "";
    const isAutoLookup = currentUser.segment === "AUTO";
    const normalizedPlate = normalizeVehiclePlate(code);

    if ((isAutoLookup && normalizedPlate.length < 7) || (!isAutoLookup && code.length < 3)) {
      return NextResponse.json(
        {
          error: isAutoLookup
            ? "Informe uma placa válida."
            : "Informe um IMEI ou número de série válido.",
        },
        { status: 400 },
      );
    }

    const variants = buildVariants(code, isAutoLookup);
    const companyId = currentUser.companyId;

    const serviceOrders = await prisma.serviceOrder.findMany({
      where: {
        companyId,
        serialNumber: { not: null },
        OR: variants.flatMap((variant) => [
          {
            serialNumber: {
              equals: variant,
              mode: "insensitive",
            },
          },
          {
            serialNumber: {
              contains: variant,
              mode: "insensitive",
            },
          },
        ]),
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const serviceOrderIds = serviceOrders.map((order) => order.id);
    const saleSearchConditions: Array<Record<string, unknown>> = [];

    if (serviceOrderIds.length > 0) {
      saleSearchConditions.push({
        serviceOrderId: {
          in: serviceOrderIds,
        },
      });
    }

    variants.forEach((variant) => {
      saleSearchConditions.push({
        items: {
          some: {
            description: {
              contains: variant,
              mode: "insensitive",
            },
          },
        },
      });
    });

    const sales = saleSearchConditions.length
      ? await prisma.sale.findMany({
          where: {
            companyId,
            status: {
              not: "REFUNDED",
            },
            OR: saleSearchConditions,
          },
          include: {
            customer: true,
            seller: {
              select: {
                id: true,
                fullName: true,
                name: true,
                role: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

    const linkedOrderIdsFromSales = Array.from(
      new Set(
        sales
          .map((sale) => sale.serviceOrderId)
          .filter((value): value is number => typeof value === "number"),
      ),
    ).filter((id) => !serviceOrderIds.includes(id));

    const linkedServiceOrders = linkedOrderIdsFromSales.length
      ? await prisma.serviceOrder.findMany({
          where: {
            companyId,
            id: {
              in: linkedOrderIdsFromSales,
            },
          },
          include: {
            customer: true,
          },
        })
      : [];

    const allServiceOrders = [...serviceOrders, ...linkedServiceOrders]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .filter(
        (order, index, array) =>
          array.findIndex((candidate) => candidate.id === order.id) === index,
      );

    if (allServiceOrders.length === 0 && sales.length === 0) {
      return NextResponse.json(
        {
          error: isAutoLookup
            ? "Nenhum histórico encontrado para esta placa."
            : "Nenhum histórico encontrado para este IMEI ou série.",
        },
        { status: 404 },
      );
    }

    const salesByServiceOrderId = new Map<number, typeof sales>();
    sales.forEach((sale) => {
      if (!sale.serviceOrderId) {
        return;
      }

      const current = salesByServiceOrderId.get(sale.serviceOrderId) || [];
      current.push(sale);
      salesByServiceOrderId.set(sale.serviceOrderId, current);
    });

    const latestServiceOrder = allServiceOrders[0] || null;
    const latestSale = sales[0] || null;
    const latestAutoChecklist =
      (latestServiceOrder?.checklist as { auto?: { plate?: string | null } } | null)
        ?.auto || null;
    const latestCoveredParts =
      latestServiceOrder
        ? (salesByServiceOrderId.get(latestServiceOrder.id) || []).flatMap((sale) =>
            sale.items.map(
              (item) =>
                item.product?.name ||
                item.description ||
                "Item sem descrição",
            ),
          )
        : [];
    const warrantyBaseDate =
      latestServiceOrder?.createdAt || latestSale?.createdAt || new Date();
    const warrantyExpiresAt = addDays(warrantyBaseDate, 90);
    const remainingDays = diffInDays(new Date(), warrantyExpiresAt);
    const withinWarranty = remainingDays >= 0;

    const timeline = [
      ...allServiceOrders.map((order) => ({
        id: `os-${order.id}`,
        type: "service-order" as const,
        date: order.createdAt.toISOString(),
        title: `Entrada da O.S. #${order.id}`,
        subtitle: `${order.deviceBrand} ${order.deviceModel}`.trim(),
        description: order.problem,
        status: order.status,
        value: order.totalPrice || 0,
        responsible: "Técnico não registrado no banco",
        notes: order.observations || null,
        parts:
          (salesByServiceOrderId.get(order.id) || []).flatMap((sale) =>
            sale.items.map(
              (item) =>
                `${item.quantity}x ${item.product?.name || item.description || "Item sem descrição"}`,
            ),
          ) || [],
      })),
      ...sales.map((sale) => ({
        id: `sale-${sale.id}`,
        type: "sale" as const,
        date: sale.createdAt.toISOString(),
        title: sale.serviceOrderId
          ? `Venda vinculada à O.S. #${sale.serviceOrderId}`
          : `Venda relacionada ao aparelho`,
        subtitle: sale.customer?.name || "Cliente não vinculado",
        description: `Pagamento via ${sale.paymentMethod}`,
        status: sale.status,
        value: sale.total,
        responsible:
          sale.seller?.fullName ||
          sale.seller?.name ||
          "Responsável não registrado",
        notes: null,
        parts: sale.items.map(
          (item) =>
            `${item.quantity}x ${item.product?.name || item.description || "Item sem descrição"}`,
        ),
      })),
    ].sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );

    return NextResponse.json({
      query: code,
      summary: {
        lookupMode: isAutoLookup ? "PLATE" : "SERIAL",
        serialNumber:
          (isAutoLookup
            ? latestAutoChecklist?.plate || latestServiceOrder?.serialNumber
            : latestServiceOrder?.serialNumber) || code,
        deviceBrand: latestServiceOrder?.deviceBrand || null,
        deviceModel: latestServiceOrder?.deviceModel || null,
        lastServiceOrderId: latestServiceOrder?.id || null,
        totalVisits: allServiceOrders.length,
        totalLinkedSales: sales.length,
        warrantyBaseDate: warrantyBaseDate.toISOString(),
        warrantyExpiresAt: warrantyExpiresAt.toISOString(),
        warrantyStatus: withinWarranty ? "ACTIVE" : "EXPIRED",
        warrantyDaysRemaining: withinWarranty ? remainingDays : 0,
        warrantyDaysExpired: withinWarranty ? 0 : Math.abs(remainingDays),
        warrantyCoverage: buildWarrantyCoverageDescription({
          isAutoLookup,
          serviceOrderId: latestServiceOrder?.id || null,
          coveredParts: latestCoveredParts,
        }),
      },
      timeline,
    });
  } catch (error) {
    console.error("[consulta] Erro ao consultar garantia:", error);
    return NextResponse.json(
      { error: "Erro ao consultar histórico de garantia." },
      { status: 500 },
    );
  }
}
