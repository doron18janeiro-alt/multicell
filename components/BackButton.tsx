"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/20 bg-transparent px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:border-amber-400/40 hover:text-amber-100"
      aria-label="Voltar para a página anterior"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Voltar</span>
    </button>
  );
}
