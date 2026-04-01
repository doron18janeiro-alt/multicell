"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { addMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
  label?: string;
}

export function DateRangePicker({
  onDateRangeChange,
  defaultStartDate,
  defaultEndDate,
  label = "Período",
}: DateRangePickerProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [startDate, setStartDate] = useState(
    defaultStartDate || format(monthStart, "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    defaultEndDate || format(monthEnd, "yyyy-MM-dd"),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(now);

  const handleApply = () => {
    onDateRangeChange(startDate, endDate);
    setIsOpen(false);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleQuickSelect = (
    type: "today" | "thisMonth" | "lastMonth" | "last30days",
  ) => {
    const today = new Date();
    let start: Date = today;
    let end: Date = today;

    switch (type) {
      case "today":
        start = today;
        end = today;
        break;
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = addMonths(today, -1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "last30days":
        end = today;
        start = addMonths(today, -1);
        break;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  const formatDateRange = () => {
    if (startDate === endDate) {
      return format(new Date(startDate), "dd 'de' MMMM", { locale: ptBR });
    }
    return `${format(new Date(startDate), "dd MMM", { locale: ptBR })} - ${format(new Date(endDate), "dd MMM", { locale: ptBR })}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#0B1120] border border-slate-700 rounded-lg text-white hover:border-[#D4AF37] transition-colors"
      >
        <Calendar size={18} />
        <span className="text-sm font-medium">{formatDateRange()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-[#112240] border border-slate-700 rounded-lg shadow-xl p-4 w-96 z-50">
          {/* Quick select buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => handleQuickSelect("today")}
              className="px-3 py-1.5 text-xs font-bold bg-[#0B1120] hover:bg-[#1e293b] border border-slate-700 rounded text-slate-300 hover:text-[#D4AF37] transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => handleQuickSelect("thisMonth")}
              className="px-3 py-1.5 text-xs font-bold bg-[#0B1120] hover:bg-[#1e293b] border border-slate-700 rounded text-slate-300 hover:text-[#D4AF37] transition-colors"
            >
              Este Mês
            </button>
            <button
              onClick={() => handleQuickSelect("lastMonth")}
              className="px-3 py-1.5 text-xs font-bold bg-[#0B1120] hover:bg-[#1e293b] border border-slate-700 rounded text-slate-300 hover:text-[#D4AF37] transition-colors"
            >
              Mês Passado
            </button>
            <button
              onClick={() => handleQuickSelect("last30days")}
              className="px-3 py-1.5 text-xs font-bold bg-[#0B1120] hover:bg-[#1e293b] border border-slate-700 rounded text-slate-300 hover:text-[#D4AF37] transition-colors"
            >
              Últimos 30
            </button>
          </div>

          {/* Date inputs */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B1120] border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-bold bg-[#D4AF37] text-black rounded hover:bg-[#C5A028] transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
