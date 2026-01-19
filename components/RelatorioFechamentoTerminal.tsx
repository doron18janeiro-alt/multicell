import React from "react";

interface RelatorioProps {
  totals: {
    money: number;
    pix: number;
    debit: number;
    credit: number;
    total: number;
    taxTotal: number;
    profit: number;
  };
  date: string;
}

export const RelatorioFechamentoTerminal = React.forwardRef<
  HTMLDivElement,
  RelatorioProps
>(({ totals, date }, ref) => {
  return (
    <div
      ref={ref}
      className="p-4 bg-white text-black font-mono text-xs w-[300px]"
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content,
          #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
      <div
        id="print-content"
        className="flex flex-col gap-2 border-b-2 border-dashed border-black pb-4 mb-4"
      >
        <div className="text-center font-bold text-sm">MULTICELL</div>
        <div className="text-center">RESUMO DE FECHAMENTO</div>
        <div className="text-center">
          {new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
        </div>
        <hr className="border-black border-dashed my-2" />

        <div className="flex justify-between">
          <span>DINHEIRO:</span>
          <span>
            {totals.money.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>PIX:</span>
          <span>
            {totals.pix.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>DÉBITO:</span>
          <span>
            {totals.debit.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span>CRÉDITO:</span>
          <span>
            {totals.credit.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <hr className="border-black border-dashed my-2" />

        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL BRUTO:</span>
          <span>
            {totals.total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span>TAXAS:</span>
          <span>
            -{" "}
            {totals.taxTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <div className="flex justify-between text-xs font-bold mt-1">
          <span>LÍQUIDO:</span>
          <span>
            {(totals.total - totals.taxTotal).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="flex justify-between font-bold text-sm mt-2 border-t border-black pt-2">
          <span>LUCRO REAL:</span>
          <span>
            {totals.profit.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="text-center mt-4 text-[10px]">
          CONFERÊNCIA DE CAIXA
          <br />
          Assinatura do Responsável
          <br />
          <br />
          __________________________
        </div>
      </div>
    </div>
  );
});

RelatorioFechamentoTerminal.displayName = "RelatorioFechamentoTerminal";
