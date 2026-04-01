"use client";

import { useEffect, useRef } from "react";
import { BARCODE_MIN_LENGTH, normalizeBarcode } from "@/lib/barcode";

type UseBarcodeListenerOptions = {
  enabled?: boolean;
  minLength?: number;
  onScan: (barcode: string) => void;
};

export function useBarcodeListener({
  enabled = true,
  minLength = BARCODE_MIN_LENGTH,
  onScan,
}: UseBarcodeListenerOptions) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let buffer = "";
    let lastKeyAt = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const now = Date.now();

      if (event.key === "Enter") {
        const normalized = normalizeBarcode(buffer);

        if (normalized.length >= minLength && now - lastKeyAt <= 250) {
          event.preventDefault();
          onScanRef.current(normalized);
        }

        buffer = "";
        lastKeyAt = 0;
        return;
      }

      if (event.key === "Escape") {
        buffer = "";
        lastKeyAt = 0;
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      if (now - lastKeyAt > 80) {
        buffer = "";
      }

      buffer += event.key;
      lastKeyAt = now;
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minLength]);
}
