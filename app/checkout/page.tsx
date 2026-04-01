import { Suspense } from "react";
import CheckoutPageClient from "@/components/CheckoutPageClient";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060b18] text-white flex items-center justify-center">
          Carregando checkout...
        </div>
      }
    >
      <CheckoutPageClient />
    </Suspense>
  );
}

