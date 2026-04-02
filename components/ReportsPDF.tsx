"use client";

import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { ReportMetrics } from "@/app/actions/reports";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");

const COMPANY_FOOTER =
  "MULTICELL | CNPJ: 48.002.640.0001/67 | AV PARANA, 470 - BELA VISTA";

const createTableOptions = (
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: string[][],
  margin: number,
  extra?: Partial<UserOptions>,
): UserOptions => ({
  startY,
  head,
  body,
  margin: { left: margin, right: margin },
  theme: "grid",
  styles: {
    font: "helvetica",
    fontSize: 9,
    textColor: [30, 30, 30],
    lineColor: [190, 190, 190],
    lineWidth: 0.1,
    cellPadding: 3,
    valign: "middle",
  },
  headStyles: {
    fillColor: [240, 240, 240],
    textColor: [20, 20, 20],
    fontStyle: "bold",
    lineColor: [170, 170, 170],
    lineWidth: 0.15,
  },
  alternateRowStyles: {
    fillColor: [252, 252, 252],
  },
  ...extra,
});

const drawHeader = (
  doc: jsPDF,
  pageWidth: number,
  margin: number,
  metrics: ReportMetrics,
) => {
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RELATORIO GERENCIAL MULTICELL", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Periodo: ${formatDate(metrics.period.startDate)} a ${formatDate(metrics.period.endDate)}`,
    margin,
    26,
  );
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })}`,
    margin,
    32,
  );

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 38, pageWidth - margin, 38);
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number, margin: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 25);
  doc.text(title, margin, y);
};

const applyFooterToAllPages = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  const pageCount = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, pageHeight - 14, pageWidth - 15, pageHeight - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(COMPANY_FOOTER, 15, pageHeight - 8);
    doc.text(`Pagina ${pageNumber} de ${pageCount}`, pageWidth - 15, pageHeight - 8, {
      align: "right",
    });
  }
};

export async function generatePDFReport(metrics: ReportMetrics) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 48;

    drawHeader(doc, pageWidth, margin, metrics);

    drawSectionTitle(doc, "1. RESUMO FINANCEIRO", yPos, margin);
    yPos += 6;

    autoTable(
      doc,
      createTableOptions(
        doc,
        yPos,
        [["INDICADOR", "VALOR"]],
        [
          ["FATURAMENTO", formatCurrency(metrics.financials.totalRevenue)],
          ["CUSTOS", formatCurrency(metrics.financials.totalCost)],
          [
            "LUCRO OPERACIONAL",
            formatCurrency(metrics.financials.operatingProfit),
          ],
          [
            "DESPESAS DA LOJA PAGAS",
            formatCurrency(metrics.financials.shopExpensesPaid),
          ],
          [
            "DESPESAS PESSOAIS PAGAS",
            formatCurrency(metrics.financials.personalExpensesPaid),
          ],
          ["LUCRO LIQUIDO", formatCurrency(metrics.financials.totalProfit)],
          ["MARGEM", `${metrics.financials.marginPercent.toFixed(2)}%`],
          ["TICKET MEDIO", formatCurrency(metrics.ticketMetrics.averageTicket)],
          [
            "TOTAL DE TRANSACOES",
            String(metrics.ticketMetrics.totalTransactions),
          ],
        ],
        margin,
      ),
    );

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (yPos > pageHeight - 90) {
      doc.addPage();
      yPos = margin;
    }

    drawSectionTitle(doc, "2. PERFORMANCE", yPos, margin);
    yPos += 6;

    autoTable(
      doc,
      createTableOptions(
        doc,
        yPos,
        [["INDICADOR", "VALOR"]],
        [
          [
            "MELHOR DIA",
            `${formatDate(metrics.performance.bestDay.date)} | ${formatCurrency(metrics.performance.bestDay.revenue)}`,
          ],
          [
            "PIOR DIA",
            `${formatDate(metrics.performance.worstDay.date)} | ${formatCurrency(metrics.performance.worstDay.revenue)}`,
          ],
          ["MEDIA DIARIA", formatCurrency(metrics.performance.dailyAverage)],
          ["CATEGORIA MAIS VENDIDA", metrics.ticketMetrics.topProductCategory],
        ],
        margin,
      ),
    );

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (yPos > pageHeight - 90) {
      doc.addPage();
      yPos = margin;
    }

    drawSectionTitle(doc, "3. METODOS DE PAGAMENTO", yPos, margin);
    yPos += 6;

    autoTable(
      doc,
      createTableOptions(
        doc,
        yPos,
        [["METODO", "TRANSACOES", "TOTAL", "PERCENTUAL"]],
        metrics.paymentMethods.map((method) => [
          method.method,
          String(method.count),
          formatCurrency(method.total),
          `${method.percentage.toFixed(2)}%`,
        ]),
        margin,
        {
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
        },
      ),
    );

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = margin;
    }

    drawSectionTitle(doc, "4. TOP PRODUTOS POR LUCRO", yPos, margin);
    yPos += 6;

    autoTable(
      doc,
      createTableOptions(
        doc,
        yPos,
        [["PRODUTO", "QTD", "FATURAMENTO", "LUCRO"]],
        metrics.topProducts.slice(0, 5).map((product) => [
          product.name,
          String(product.quantity),
          formatCurrency(product.revenue),
          formatCurrency(product.profit),
        ]),
        margin,
        {
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
        },
      ),
    );

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (metrics.teamPerformance.length > 0) {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin;
      }

      drawSectionTitle(doc, "5. PERFORMANCE DA EQUIPE", yPos, margin);
      yPos += 6;

      autoTable(
        doc,
        createTableOptions(
          doc,
          yPos,
          [["VENDEDOR", "VENDAS", "COMISSAO", "QTDE", "TICKET MEDIO"]],
          metrics.teamPerformance.map((seller) => [
            seller.sellerName,
            formatCurrency(seller.totalSales),
            formatCurrency(seller.commissionToPay),
            String(seller.salesCount),
            formatCurrency(seller.averageTicket),
          ]),
          margin,
          {
            columnStyles: {
              1: { halign: "right" },
              2: { halign: "right" },
              3: { halign: "right" },
              4: { halign: "right" },
            },
          },
        ),
      );
    }

    applyFooterToAllPages(doc, pageWidth, pageHeight);

    const filename = `relatorio_multicell_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);

    return filename;
  } catch (error) {
    console.error("[generatePDFReport] Error:", error);
    throw error;
  }
}

export function generateWhatsAppMessage(metrics: ReportMetrics): string {
  const message = `
📊 *RELATÓRIO MULTICELL* 📅 ${new Date().toLocaleDateString("pt-BR")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *FATURAMENTO:* ${formatCurrency(metrics.financials.totalRevenue)}
⚙️ *LUCRO OPERACIONAL:* ${formatCurrency(metrics.financials.operatingProfit)}
🏬 *DESPESAS DA LOJA PAGAS:* ${formatCurrency(metrics.financials.shopExpensesPaid)}
👤 *DESPESAS PESSOAIS PAGAS:* ${formatCurrency(metrics.financials.personalExpensesPaid)}
📈 *LUCRO LIQUIDO REAL:* ${formatCurrency(metrics.financials.totalProfit)}
   Margem: ${metrics.financials.marginPercent}%

🎯 *TICKET MÉDIO:* ${formatCurrency(metrics.ticketMetrics.averageTicket)}
📊 *TOTAL DE TRANSAÇÕES:* ${metrics.ticketMetrics.totalTransactions}

🏆 *MELHOR DIA:* ${new Date(metrics.performance.bestDay.date).toLocaleDateString("pt-BR")}
   Faturamento: ${formatCurrency(metrics.performance.bestDay.revenue)}

📉 *PIOR DIA:* ${new Date(metrics.performance.worstDay.date).toLocaleDateString("pt-BR")}
   Faturamento: ${formatCurrency(metrics.performance.worstDay.revenue)}

💡 *MÉDIA DIÁRIA:* ${formatCurrency(metrics.performance.dailyAverage)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Período: ${new Date(metrics.period.startDate).toLocaleDateString("pt-BR")} a ${new Date(metrics.period.endDate).toLocaleDateString("pt-BR")}
*MULTICELL ASSISTÊNCIA TÉCNICA*
📞 (43) 99603-1208
`;

  return message.trim();
}
