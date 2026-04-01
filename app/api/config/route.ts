import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let config = await prisma.companyConfig.findFirst({
      where: { companyId: currentUser.companyId },
    });

    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          name: "Multicell",
          companyId: currentUser.companyId,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json(
      { error: "Error fetching configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    let config = await prisma.companyConfig.findFirst({
      where: { companyId: currentUser.companyId },
    });

    if (config) {
      config = await prisma.companyConfig.update({
        where: { id: config.id },
        data: {
          name: data.name,
          document: data.document,
          phone: data.phone,
          address: data.address,
          logoUrl: data.logoUrl,
          debitRate: parseFloat(data.debitRate) || 0,
          creditRate: parseFloat(data.creditRate) || 0,
          taxPix: parseFloat(data.taxPix) || 0,
          taxCash: parseFloat(data.taxCash) || 0,
        },
      });
    } else {
      config = await prisma.companyConfig.create({
        data: {
          companyId: currentUser.companyId,
          name: data.name,
          document: data.document,
          phone: data.phone,
          address: data.address,
          logoUrl: data.logoUrl,
          debitRate: parseFloat(data.debitRate) || 0,
          creditRate: parseFloat(data.creditRate) || 0,
          taxPix: parseFloat(data.taxPix) || 0,
          taxCash: parseFloat(data.taxCash) || 0,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json(
      { error: "Error updating configuration" },
      { status: 500 }
    );
  }
}
