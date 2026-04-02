"use client";

import Link from "next/link";
import { Globe2, Menu } from "lucide-react";

type HeaderMobileProps = {
  onOpenMenu: () => void;
};

export default function HeaderMobile({ onOpenMenu }: HeaderMobileProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1E293B]/60 bg-[#0B1121]/95 px-4 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E293B] bg-[#0F172A]/80 text-slate-100 transition-colors hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>

        <Link
          href="/dashboard"
          className="flex min-w-0 flex-1 flex-col items-center justify-center"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/10">
            <Globe2 className="h-5 w-5 text-[#FACC15]" />
          </div>
          <span className="mt-1 text-[11px] font-black tracking-[0.38em] text-[#FACC15]">
            WTM
          </span>
        </Link>

        <div className="h-10 w-10 shrink-0" aria-hidden="true" />
      </div>
    </header>
  );
}
