"use client";

import React, { useState } from "react";
import { Scissors } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";
import { toast } from "sonner";
import { registerSplitSubQrFromMainMaAction } from "../../actions/cssd-register-label.actions";

interface Props {
  qrCode: string;
  tenBoDungCu: string;
}

/** Tách bộ SUB — in tem định danh bộ mới (cùng format danh mục). */
export default function SplitAndPrintSubQrButton({ qrCode, tenBoDungCu }: Props) {
  const { printBoLabel, isPrinting } = usePrint();
  const [isSplitting, setIsSplitting] = useState(false);

  const handleSplitAndPrint = async () => {
    setIsSplitting(true);
    try {
      const res = await registerSplitSubQrFromMainMaAction(qrCode);
      if (!res.success) {
        throw new Error(res.error || "Không thể tách bộ dụng cụ.");
      }

      toast.success("Tách bộ thành công!", {
        description: `Mã phụ: ${res.ma_vach_qr_phu}`,
      });

      await printBoLabel({
        qrCode: res.ma_vach_qr_phu,
        tenBo: `${tenBoDungCu} (SUB · nhạy nhiệt)`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Đã xảy ra sự cố trong quá trình tách.";
      toast.error("Lỗi tách bộ", { description: message });
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleSplitAndPrint()}
      disabled={isPrinting || isSplitting}
      className="w-full h-14 bg-rose-50 text-rose-700 border-2 border-rose-200 rounded-[20px] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-rose-900/5 active:scale-95 transition-all disabled:opacity-50 touch-manipulation pointer-events-auto -webkit-tap-highlight-color-transparent mt-3"
    >
      {isSplitting ? (
        <span className="w-5 h-5 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Scissors size={20} strokeWidth={2.5} />
      )}
      {isPrinting ? "ĐANG IN MÃ SUB..." : isSplitting ? "ĐANG TÁCH BỘ..." : "TÁCH MÃ SUB (TIỆT KHUẨN PLASMA/EO)"}
    </button>
  );
}
