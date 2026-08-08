"use client";

import React, { useState } from "react";
import { Loader2, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";

/** Nút in tem QR máy — mã quét = `ma_thiet_bi` (SSOT, đã hỗ trợ quét bảo trì / QR hub). */
export default function ThietBiPrintQrButton({
  thietBiId,
  maThietBi,
  tenThietBi,
  variant = "button",
  className = "",
}: {
  thietBiId: string;
  maThietBi: string;
  tenThietBi: string;
  variant?: "button" | "compact";
  className?: string;
}) {
  const { printMachineLabel } = usePrint();
  const [printing, setPrinting] = useState(false);
  const qrCode = String(maThietBi || "").trim().toUpperCase();

  async function handlePrint(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!qrCode) {
      toast.error("Thiết bị chưa có mã — cập nhật tại Quản trị trước khi in.");
      return;
    }
    setPrinting(true);
    try {
      await printMachineLabel({ qrCode, tenBo: tenThietBi || qrCode });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg) toast.error(msg);
    } finally {
      setPrinting(false);
    }
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        disabled={printing || !qrCode}
        onClick={(e) => void handlePrint(e)}
        className={`bv103-control-h inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 touch-manipulation ${className}`}
        title="In tem QR máy"
      >
        {printing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
        In QR
      </button>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
        <QrCode className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" aria-hidden />
        <span className="min-w-0 truncate font-mono text-[11px] font-bold text-[var(--primary)]" title={qrCode || "—"}>
          {qrCode || "—"}
        </span>
      </div>
      <button
        type="button"
        disabled={printing || !qrCode}
        onClick={(e) => void handlePrint(e)}
        data-thiet-bi-id={thietBiId}
        className="bv103-control-h inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 touch-manipulation"
      >
        {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
        In tem QR
      </button>
    </div>
  );
}
