"use client";

import React, { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import { registerPhysicalBoLabelFromDmAction } from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";

/** In tem QR bộ — tái dùng đăng ký nhãn vật lý CSSD + printBoLabel. */
export default function BoDungCuPrintQrButton({
  boId,
  className = "",
}: {
  boId: string;
  className?: string;
}) {
  const { printBoLabel } = usePrint();
  const [printing, setPrinting] = useState(false);

  async function handlePrint(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!boId) return;
    setPrinting(true);
    try {
      const res = await registerPhysicalBoLabelFromDmAction(boId);
      if (!res.success) {
        toast.error(res.error || "Không tạo được nhãn QR.");
        return;
      }
      toast.success(`Đã tạo mã bộ: ${res.ma_vach_qr}`);
      await printBoLabel({
        qrCode: res.ma_vach_qr,
        tenBo: res.ten_bo,
      });
      window.dispatchEvent(new CustomEvent("cssd:kho-refetch"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg) toast.error(msg);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <button
      type="button"
      disabled={printing || !boId}
      onClick={(e) => void handlePrint(e)}
      className={`inline-flex items-center gap-1 rounded-lg border border-emerald-200/50 bg-emerald-50 px-2 py-1 font-mono text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-50 touch-manipulation ${className}`}
      title="In tem QR bộ (tem vĩnh viễn — khác tem chu trình túi hấp)"
    >
      {printing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
      In QR
    </button>
  );
}
