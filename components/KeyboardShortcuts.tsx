"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        router.push("/vendas");
      }
      if (e.key === "F3") {
        e.preventDefault();
        router.push("/os");
      }
      if (e.key === "F4") {
        e.preventDefault();
        router.push("/estoque");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
