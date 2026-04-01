"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportMetrics } from "@/app/actions/reports";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

    // ===== CABEÇALHO =====
    // Fundo premium
    doc.setFillColor(11, 17, 32); // #0B1120
    doc.rect(0, 0, pageWidth, 50, "F");

    // Título
    doc.setTextColor(212, 175, 55); // Gold
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("MULTICELL", margin, 20);

    // Subtítulo
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Assistência Técnica Especializada", margin, 27);

    // Data
    doc.setFontSize(9);
    doc.text(
      `Relatório gerado em: ${new Date().toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      margin,
      35,
    );

    // Período
    doc.text(
      `Período: ${new Date(metrics.period.startDate).toLocaleDateString("pt-BR")} a ${new Date(metrics.period.endDate).toLocaleDateString("pt-BR")}`,
      margin,
      42,
    );

    let yPos = 60;

    // ===== SEÇÃO 1: RESUMO FINANCEIRO =====
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("💰 RESUMO FINANCEIRO", margin, yPos);

    yPos += 12;

    const financialData = [
      ["Métrica", "Valor"],
      ["Faturamento Total", formatCurrency(metrics.financials.totalRevenue)],
      ["Custo Total", formatCurrency(metrics.financials.totalCost)],
      [
        "Lucro Operacional",
        formatCurrency(metrics.financials.operatingProfit),
      ],
      [
        "Despesas Loja Pagas",
        formatCurrency(metrics.financials.shopExpensesPaid),
      ],
      [
        "Despesas Pessoais Pagas",
        formatCurrency(metrics.financials.personalExpensesPaid),
      ],
      ["Lucro Liquido Real", formatCurrency(metrics.financials.totalProfit)],
      ["Margem de Lucro", `${metrics.financials.marginPercent}%`],
      ["Ticket Médio", formatCurrency(metrics.ticketMetrics.averageTicket)],
      ["Total de Transações", `${metrics.ticketMetrics.totalTransactions}`],
    ];

    autoTable(doc, {
      head: [financialData[0]],
      body: financialData.slice(1),
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 5,
        fontSize: 10,
        textColor: [200, 200, 200],
        fillColor: [25, 28, 50],
        lineColor: [100, 100, 120],
      },
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [11, 17, 32],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [20, 24, 44],
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ===== SEÇÃO 2: PERFORMANCE =====
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("📊 PERFORMANCE", margin, yPos);

    yPos += 12;

    const performanceData = [
      ["Métrica", "Valor"],
      [
        "Melhor Dia",
        `${metrics.performance.bestDay.date} (${formatCurrency(metrics.performance.bestDay.revenue)})`,
      ],
      [
        "Pior Dia",
        `${metrics.performance.worstDay.date} (${formatCurrency(metrics.performance.worstDay.revenue)})`,
      ],
      ["Média Diária", formatCurrency(metrics.performance.dailyAverage)],
      ["Melhor Categoria", metrics.ticketMetrics.topProductCategory],
    ];

    autoTable(doc, {
      head: [performanceData[0]],
      body: performanceData.slice(1),
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 5,
        fontSize: 10,
        textColor: [200, 200, 200],
        fillColor: [25, 28, 50],
        lineColor: [100, 100, 120],
      },
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [11, 17, 32],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [20, 24, 44],
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ===== SEÇÃO 3: FORMAS DE PAGAMENTO =====
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("💳 FORMAS DE PAGAMENTO", margin, yPos);

    yPos += 12;

    const paymentData = [
      ["Método", "Transações", "Total", "Percentual"],
      ...metrics.paymentMethods.map((pm) => [
        pm.method,
        `${pm.count}`,
        formatCurrency(pm.total),
        `${pm.percentage.toFixed(1)}%`,
      ]),
    ];

    autoTable(doc, {
      head: [paymentData[0]],
      body: paymentData.slice(1),
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 5,
        fontSize: 10,
        textColor: [200, 200, 200],
        fillColor: [25, 28, 50],
        lineColor: [100, 100, 120],
      },
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [11, 17, 32],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [20, 24, 44],
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ===== SEÇÃO 4: TOP 5 PRODUTOS =====
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("🏆 TOP 5 PRODUTOS", margin, yPos);

    yPos += 12;

    const topProductsData = [
      ["Produto", "Qtd", "Faturamento", "Lucro"],
      ...metrics.topProducts
        .slice(0, 5)
        .map((p) => [
          p.name.substring(0, 30),
          `${p.quantity}`,
          formatCurrency(p.revenue),
          formatCurrency(p.profit),
        ]),
    ];

    autoTable(doc, {
      head: [topProductsData[0]],
      body: topProductsData.slice(1),
      startY: yPos,
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 5,
        fontSize: 10,
        textColor: [200, 200, 200],
        fillColor: [25, 28, 50],
        lineColor: [100, 100, 120],
      },
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [11, 17, 32],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [20, 24, 44],
      },
    });

    // ===== RODAPÉ =====
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(
      `📍 Av. Paraná, 470 - Cândido de Abreu/PR | 📞 (43) 99603-1208 | CNPJ: 48.002.640.0001/67`,
      margin,
      pageHeight - 10,
    );

    // ===== SALVAR =====
    const filename = `relatorio_multicell_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);

    return filename;
  } catch (error) {
    console.error("[generatePDFReport] Error:", error);
    throw error;
  }
}

/**
 * 📱 Gera resumo formatado para WhatsApp
 */
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
