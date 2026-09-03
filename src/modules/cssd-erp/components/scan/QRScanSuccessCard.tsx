"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, User, Clock, ArrowRight, Printer } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

interface Props {
  qrCode: string;
  tenBoDungCu: string;
  nguoiThucHien: string;
  thoiGianQuet: string;
  buocTiepTheo: string;
  /** Trạm hiện tại (từ trang cha; tránh gọi hook trùng state). */
  tramDisplay?: string;
  maLoTietKhuan?: string;
  ledgerWarning?: string;
  /** Tem chu trình túi hấp (khác tem bộ vĩnh viễn). */
  maCycleQr?: string | null;
  /** Trạm cấp phát: in phiếu A4 (QR mã mẻ). */
  onPrintCapPhat?: () => void;
  isPrintBusy?: boolean;
}

/**
 * Thẻ thông báo quét thành công — Ops dialect (không poster vàng).
 */
export default function QRScanSuccessCard({
  qrCode,
  tenBoDungCu,
  nguoiThucHien,
  thoiGianQuet,
  buocTiepTheo,
  tramDisplay = "CSSD",
  maLoTietKhuan,
  ledgerWarning,
  maCycleQr,
  onPrintCapPhat,
  isPrintBusy,
}: Props) {
  const tramKey = tramDisplay.replace(/\s+/g, "_").toUpperCase();
  const isCapPhat = tramKey === "CAP_PHAT" || tramDisplay === "Cấp phát";
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const code = String(qrCode || "").trim();
    if (!code) {
      setQrDataUrl(null);
      return;
    }
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(code, {
          margin: 1,
          width: 200,
          color: { dark: "#000000", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qrCode]);

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-[360px] animate-in zoom-in-95 duration-200 touch-manipulation [-webkit-tap-highlight-color:transparent]">
      <div className={`${C.panelSurface} overflow-hidden`}>
        <div className="flex flex-col items-center p-5 text-center">
          <div className="mb-3 rounded-full bg-[var(--primary)]/10 p-3 text-[var(--primary)]">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} aria-hidden />
          </div>

          <h2 className={T.sectionTitle}>Quét thành công</h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Hệ thống đã ghi nhận bản ghi</p>

          <div className="mt-4 w-full space-y-[var(--bv103-space-3)] bv103-layer-inset bv103-pad-inset">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-[var(--radius-control)] bg-white p-2">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR" className="h-28 w-28 object-contain" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center font-mono text-[11px] text-slate-400">
                    QR
                  </div>
                )}
              </div>
              <p className={`${T.metaMono} text-sm text-[var(--primary)]`}>{qrCode}</p>
              {maCycleQr && maCycleQr !== qrCode ? (
                <p className="text-[11px] font-medium text-slate-500">
                  Tem chu trình: <span className="font-mono">{maCycleQr}</span>
                </p>
              ) : null}
            </div>

            <div className="h-px w-full bg-slate-200/80" />

            <div className="space-y-3 px-0.5 text-left">
              <div>
                <p className={T.labelBlock}>Bộ dụng cụ</p>
                <p className="text-sm font-semibold leading-snug text-slate-800">{tenBoDungCu}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className={`flex items-center gap-1 ${T.labelBlock}`}>
                    <User className="h-3 w-3" aria-hidden /> Người thực hiện
                  </p>
                  <p className="truncate text-[11px] font-semibold text-slate-800">{nguoiThucHien}</p>
                </div>
                <div className="space-y-0.5 border-l border-slate-100 pl-3">
                  <p className={`flex items-center gap-1 ${T.labelBlock}`}>
                    <Clock className="h-3 w-3" aria-hidden /> Thời gian
                  </p>
                  <p className="text-[11px] font-semibold text-slate-800">{thoiGianQuet}</p>
                </div>
              </div>
            </div>

            {maLoTietKhuan ? (
              <div className={`${C.noticeSuccess} text-left`}>
                <p className={T.labelBlock}>Mã mẻ tiệt khuẩn (QR trên phiếu)</p>
                <p className="font-mono text-sm font-semibold">{maLoTietKhuan}</p>
              </div>
            ) : null}

            {ledgerWarning ? (
              <div className={`${C.noticeDanger} text-left`}>
                <p className="text-[11px] font-semibold">Thiếu dụng cụ — vẫn cấp</p>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed">{ledgerWarning}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex w-full items-center justify-between gap-3 bv103-layer-inset bv103-pad-inset text-left">
            <div>
              <p className={T.labelBlock}>Bước tiếp theo</p>
              <p className="text-sm font-semibold text-slate-800">{buocTiepTheo}</p>
            </div>
            <div className="rounded-full bg-[var(--primary)] p-2 text-white">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </div>
          </div>

          {isCapPhat && onPrintCapPhat ? (
            <button
              type="button"
              disabled={isPrintBusy}
              onClick={onPrintCapPhat}
              className={`${C.btnPrimary} mt-4 w-full`}
            >
              <Printer className="h-4 w-4" aria-hidden />
              {isPrintBusy ? "Đang chuẩn bị in…" : "In phiếu cấp phát A4"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
