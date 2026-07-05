"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
};

const READER_ID = "bv103-qr-camera-reader";

export default function QrCameraModal({
  open,
  onClose,
  onScan,
  title = "Quét mã QR",
}: Props) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const handledRef = useRef(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    handledRef.current = false;
    let cancelled = false;
    setStarting(true);

    const stopScanner = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          await s.stop();
        } catch {
          /* ignore */
        }
      }
    };

    void (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const html5Qr = new Html5Qrcode(READER_ID);
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
              return { width: edge, height: edge };
            },
          },
          (decodedText) => {
            if (handledRef.current) return;
            const code = decodedText.trim().toUpperCase();
            if (!code) return;
            handledRef.current = true;
            void stopScanner().then(() => {
              onScan(code);
              onClose();
            });
          },
          () => {},
        );
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error
              ? e.message
              : "Không mở được camera. Cho phép quyền camera trên trình duyệt hoặc nhập mã tay.",
          );
          onClose();
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, onScan, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 touch-manipulation"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Camera size={20} className="shrink-0 text-emerald-400" aria-hidden />
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
          aria-label="Đóng camera"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-8">
        {starting ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/80">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-xs font-medium">Đang mở camera…</p>
          </div>
        ) : null}
        <div
          id={READER_ID}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black [&_video]:rounded-2xl"
        />
        <p className="mt-4 max-w-sm text-center text-xs leading-relaxed text-white/70">
          Đưa mã QR vào khung. Trên điện thoại/máy tính bảng cần cho phép quyền camera (HTTPS hoặc localhost).
        </p>
      </div>
    </div>
  );
}
