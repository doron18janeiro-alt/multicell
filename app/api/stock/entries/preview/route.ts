import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FocusNfeError,
  baixarXmlNfeRecebidaPorChave,
  consultarNfeRecebidaPorChave,
} from "@/lib/focus-nfe";
import { extractNfeAccessKey } from "@/lib/nfe-access-key";
import {
  buildStockEntryPreview,
  parseNfeXmlDocument,
} from "@/lib/stock-entry";
import type { StockEntryImportMethod } from "@/lib/stock-entry-types";

const isImportMethod = (value: string): value is StockEntryImportMethod =>
  value === "XML_UPLOAD" || value === "ACCESS_KEY" || value === "DANFE_SCAN";

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
    const method = String(body.method || "").trim().toUpperCase();

    if (!isImportMethod(method)) {
      return NextResponse.json(
        { error: "Metodo de importacao invalido." },
        { status: 400 },
      );
    }

    const companyId = currentUser.companyId || "multicell-oficial";
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        segment: true,
        companyData: true,
        certificateA1: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Empresa nao encontrada." },
        { status: 404 },
      );
    }

    let xmlContent = "";
    let xmlSource: "upload" | "focus" = "upload";
    let rawSummary:
      | {
          status?: string | null;
          manifestStatus?: string | null;
          xmlAvailable?: boolean;
        }
      | undefined;
    let externalAccessKey = "";

    if (method === "XML_UPLOAD") {
      xmlContent = String(body.xmlContent || "").trim();

      if (!xmlContent.includes("<")) {
        return NextResponse.json(
          { error: "Selecione um XML valido da NF-e para continuar." },
          { status: 400 },
        );
      }

      externalAccessKey = extractNfeAccessKey(body.accessKey);
    } else {
      externalAccessKey = extractNfeAccessKey(
        body.accessKey || body.scannedValue || body.rawValue,
      );

      if (!externalAccessKey) {
        return NextResponse.json(
          { error: "Informe uma chave de acesso valida com 44 digitos." },
          { status: 400 },
        );
      }

      const receivedSummary = await consultarNfeRecebidaPorChave({
        accessKey: externalAccessKey,
        companyData: company.companyData,
        certificateA1: company.certificateA1,
      });

      rawSummary = {
        status: receivedSummary.status,
        manifestStatus: receivedSummary.manifestStatus,
        xmlAvailable: receivedSummary.xmlAvailable,
      };
      xmlSource = "focus";
      xmlContent = await baixarXmlNfeRecebidaPorChave({
        accessKey: externalAccessKey,
        companyData: company.companyData,
        certificateA1: company.certificateA1,
      });
    }

    const invoice = parseNfeXmlDocument(xmlContent, company.segment);
    const accessKey = invoice.accessKey || externalAccessKey || null;

    if (accessKey) {
      const existingEntry = await prisma.stockEntry.findFirst({
        where: {
          companyId,
          accessKey,
        },
        select: {
          id: true,
          invoiceNumber: true,
        },
      });

      if (existingEntry) {
        return NextResponse.json(
          {
            error: `A NF-e ${existingEntry.invoiceNumber || accessKey} ja foi processada anteriormente neste estoque.`,
          },
          { status: 409 },
        );
      }
    }

    const barcodes = Array.from(
      new Set(
        invoice.items
          .map((item) => String(item.barcode || "").trim())
          .filter(Boolean),
      ),
    );
    const descriptions = Array.from(
      new Set(
        invoice.items
          .map((item) => String(item.description || "").trim())
          .filter(Boolean),
      ),
    );
    const productCandidates =
      barcodes.length > 0 || descriptions.length > 0
        ? await prisma.product.findMany({
            where: {
              companyId,
              OR: [
                ...(barcodes.length > 0
                  ? [
                      {
                        barcode: {
                          in: barcodes,
                        },
                      },
                    ]
                  : []),
                ...(descriptions.length > 0
                  ? [
                      {
                        name: {
                          in: descriptions,
                        },
                      },
                    ]
                  : []),
              ],
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
            },
          })
        : [];

    const preview = buildStockEntryPreview({
      method,
      xmlSource,
      segment: company.segment,
      invoice: {
        ...invoice,
        accessKey,
      },
      products: productCandidates.map((product) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        ncm: product.ncm,
        category: product.category,
        stock: Number(product.stock || 0),
        costPrice: Number(product.costPrice || 0),
        salePrice: Number(product.salePrice || 0),
      })),
      rawSummary,
    });

    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof FocusNfeError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status },
      );
    }

    console.error("[stock][entries][preview] Error:", error);
    return NextResponse.json(
      { error: "Erro ao montar a previa da nota." },
      { status: 500 },
    );
  }
}

