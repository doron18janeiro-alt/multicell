import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let config = await prisma.companyConfig.findFirst();

    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          name: "Multicell",
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
    const data = await req.json();
    let config = await prisma.companyConfig.findFirst();

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
