"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
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
      className={`text-[11px] font-semibold text-[var(--primary)] hover:underline disabled:opacity-50 ${className}`}
      title="In tem QR bộ (tem vĩnh viễn — khác tem chu trình túi hấp)"
    >
      {printing ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
      In
    </button>
  );
}
