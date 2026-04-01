"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ScanBarcode, X } from "lucide-react";
import { normalizeBarcode } from "@/lib/barcode";

type BarcodeScannerModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onDetected: (barcode: string) => void;
};

async function stopScannerInstance(scanner: any) {
  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch {}

  try {
    await scanner.clear();
  } catch {}
}

export function BarcodeScannerModal({
  open,
  title,
  description,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const scannerId = useId().replace(/:/g, "");
  const scannerRef = useRef<any>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      detectedRef.current = false;
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      setLoading(true);
      setError("");

      try {
        const module = await import("html5-qrcode");
        const Html5Qrcode = module.Html5Qrcode as any;
        const Html5QrcodeSupportedFormats =
          module.Html5QrcodeSupportedFormats as unknown as Record<
            string,
            number
          >;

        if (cancelled) {
          return;
        }

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.7777778,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ].filter(Boolean),
        };

        const onSuccess = async (decodedText: string) => {
          if (detectedRef.current) {
            return;
          }

          const normalized = normalizeBarcode(decodedText);

          if (!normalized) {
            return;
          }

          detectedRef.current = true;
          onDetected(normalized);
          await stopScannerInstance(scannerRef.current);
          scannerRef.current = null;
          onClose();
        };

        const onError = () => {};

        try {
          await scanner.start(
            { facingMode: { exact: "environment" } },
            config,
            onSuccess,
            onError,
          );
        } catch {
          await scanner.start(
            { facingMode: "environment" },
            config,
            onSuccess,
            onError,
          );
        }
      } catch (scannerError) {
        console.error("[BarcodeScanner] Error:", scannerError);
        setError(
          "Não foi possível acessar a câmera. Verifique a permissão do navegador.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      detectedRef.current = false;
      void stopScannerInstance(scannerRef.current);
      scannerRef.current = null;
    };
  }, [open, onClose, onDetected, scannerId]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-[#0B1120]/95 p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
              <ScanBarcode className="h-6 w-6 text-sky-400" />
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition-colors hover:border-red-400 hover:text-red-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-black">
          <div id={scannerId} className="min-h-[280px] w-full" />
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <Camera className="h-4 w-4" />
            Inicializando câmera...
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
