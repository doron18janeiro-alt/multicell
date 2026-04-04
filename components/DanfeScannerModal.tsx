"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ScanLine, Sparkles, X } from "lucide-react";
import { extractNfeAccessKey } from "@/lib/nfe-access-key";

type DanfeScannerModalProps = {
  open: boolean;
  onClose: () => void;
  onDetected: (accessKey: string) => void;
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

export function DanfeScannerModal({
  open,
  onClose,
  onDetected,
}: DanfeScannerModalProps) {
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
        const SupportedFormats =
          module.Html5QrcodeSupportedFormats as unknown as Record<string, number>;

        if (cancelled) {
          return;
        }

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        const formats = [
          SupportedFormats.QR_CODE,
          SupportedFormats.PDF_417,
          SupportedFormats.CODE_128,
          SupportedFormats.CODE_39,
          SupportedFormats.EAN_13,
          SupportedFormats.EAN_8,
        ].filter(Boolean);

        const onSuccess = async (decodedText: string) => {
          if (detectedRef.current) {
            return;
          }

          const accessKey = extractNfeAccessKey(decodedText);

          if (!accessKey) {
            return;
          }

          detectedRef.current = true;
          onDetected(accessKey);
          await stopScannerInstance(scannerRef.current);
          scannerRef.current = null;
          onClose();
        };

        const onError = () => {};

        const config = {
          fps: 12,
          qrbox: { width: 280, height: 220 },
          aspectRatio: 1.5,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          formatsToSupport: formats,
        };

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
        console.error("[DanfeScanner] Error:", scannerError);
        setError(
          "Nao foi possivel acessar a camera. Verifique a permissao do navegador.",
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[32px] border border-cyan-400/20 bg-[#06101d]/95 p-5 shadow-[0_0_60px_rgba(34,211,238,0.18)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              Scanner DANFE
            </p>
            <h2 className="mt-2 flex items-center gap-3 text-2xl font-black text-white">
              <ScanLine className="h-7 w-7 text-cyan-300" />
              Extraindo chave da NF-e
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Aponte a camera para o codigo de barras ou QR Code da DANFE. O
              WTM vai capturar os 44 digitos automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-slate-400 transition-colors hover:border-red-400 hover:text-red-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-[28px] border border-cyan-400/20 bg-[#020617] p-4">
          <div className="relative overflow-hidden rounded-[24px] border border-cyan-400/20 bg-black">
            <div id={scannerId} className="min-h-[360px] w-full" />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-10 top-8 bottom-8 rounded-[28px] border border-cyan-300/25 shadow-[inset_0_0_80px_rgba(34,211,238,0.12)]" />
              <div className="absolute left-14 top-12 h-10 w-10 border-l-4 border-t-4 border-cyan-300" />
              <div className="absolute right-14 top-12 h-10 w-10 border-r-4 border-t-4 border-cyan-300" />
              <div className="absolute bottom-12 left-14 h-10 w-10 border-b-4 border-l-4 border-cyan-300" />
              <div className="absolute bottom-12 right-14 h-10 w-10 border-b-4 border-r-4 border-cyan-300" />
              <div className="absolute inset-x-16 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_rgba(34,211,238,0.8)]" />
              <div className="absolute inset-x-16 top-1/2 h-16 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-pulse" />
              <div className="absolute right-8 top-8 flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Scanner ativo
              </div>
              <div className="absolute inset-x-0 bottom-5 text-center text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/90">
                Alinhe a DANFE dentro da area de captura
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            <Camera className="h-4 w-4" />
            Inicializando leitor de DANFE...
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

