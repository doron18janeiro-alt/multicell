"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

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
          className="flex min-w-0 flex-1 items-center justify-center"
        >
          <Image
            src="/logo.png"
            alt="Multicell"
            width={132}
            height={40}
            priority
            className="h-9 w-auto drop-shadow-md"
          />
        </Link>

        <div className="h-10 w-10 shrink-0" aria-hidden="true" />
      </div>
    </header>
  );
}
