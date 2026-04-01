"use client";

import { useEffect, useMemo, useState } from "react";

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
  startDate?: string;
  endDate?: string;
  defaultFromDays?: number;
  label?: string;
}

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatReadableDate = (dateStr: string) => {
  if (!dateStr) return "--/--/----";
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const daysBetween = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

export function DateRangePickerGlass({
  onDateRangeChange,
  startDate,
  endDate,
  defaultFromDays = 30,
  label = "Período",
}: DateRangePickerProps) {
  const today = useMemo(() => new Date(), []);

  const defaultStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - defaultFromDays);
    return formatInputDate(date);
  }, [defaultFromDays, today]);

  const defaultEnd = useMemo(() => formatInputDate(today), [today]);

  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate || defaultStart);
  const [localEndDate, setLocalEndDate] = useState(endDate || defaultEnd);

  useEffect(() => {
    if (startDate) setLocalStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    if (endDate) setLocalEndDate(endDate);
  }, [endDate]);

  const applyRange = (start: string, end: string) => {
    const orderedStart = start <= end ? start : end;
    const orderedEnd = end >= start ? end : start;
    setLocalStartDate(orderedStart);
    setLocalEndDate(orderedEnd);
    onDateRangeChange(orderedStart, orderedEnd);
  };

  const handlePreset = (days: number) => {
    const presetEnd = formatInputDate(new Date());
    const start = new Date();
    start.setDate(start.getDate() - days);
    const presetStart = formatInputDate(start);

    applyRange(presetStart, presetEnd);
    setIsOpen(false);
  };

  const handleApply = () => {
    applyRange(localStartDate, localEndDate);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/45 backdrop-blur-xl border border-zinc-700/50 hover:border-amber-400/50 transition-all text-sm font-medium text-white hover:text-amber-300"
        title={`${formatReadableDate(localStartDate)} até ${formatReadableDate(localEndDate)}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v2H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v2H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
        <span>{label}</span>
        <span className="text-xs text-amber-400 font-bold">
          {daysBetween(localStartDate, localEndDate)}d
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl p-6 w-96 z-50">
          <div className="mb-4 pb-4 border-b border-zinc-700/40">
            <h3 className="text-white font-bold text-lg">Selecionar Período</h3>
            <p className="text-xs text-slate-400 mt-1">
              {formatReadableDate(localStartDate)} até{" "}
              {formatReadableDate(localEndDate)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <button
              onClick={() => handlePreset(0)}
              className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/40"
            >
              Hoje
            </button>
            <button
              onClick={() => handlePreset(7)}
              className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/40"
            >
              7 dias
            </button>
            <button
              onClick={() => handlePreset(30)}
              className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/40"
            >
              30 dias
            </button>
            <button
              onClick={() => handlePreset(90)}
              className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/40"
            >
              90 dias
            </button>
            <button
              onClick={() => handlePreset(180)}
              className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800/60 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/40 col-span-2"
            >
              6 meses
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Data Inicial
              </label>
              <input
                type="date"
                value={localStartDate}
                onChange={(event) => setLocalStartDate(event.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-white text-sm focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Data Final
              </label>
              <input
                type="date"
                value={localEndDate}
                onChange={(event) => setLocalEndDate(event.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-white text-sm focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800/60 text-slate-300 text-sm font-medium hover:bg-zinc-700/60 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-2 rounded-lg bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition-all"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
