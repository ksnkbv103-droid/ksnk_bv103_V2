// src/modules/cssd-erp/components/station/SplitAndPrintSubQrButton.tsx
"use client";

import React, { useState } from "react";
import { Scissors, Printer } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";
import { toast } from "sonner";
import { registerSplitSubQrFromMainMaAction } from "../../actions/cssd-register-label.actions";

interface Props {
  data: {
    qrCode: string;
    tenBoDungCu: string;
    tram: string;
    nguoiThucHien: string;
    thoiGian: string;
  };
}

export default function SplitAndPrintSubQrButton({ data }: Props) {
  const { printLabel, isPrinting } = usePrint();
  const [isSplitting, setIsSplitting] = useState(false);

  const handleSplitAndPrint = async () => {
    setIsSplitting(true);
    try {
      // 1. Thực hiện tách mã (Tạo SUB QR)
      const res = await registerSplitSubQrFromMainMaAction(data.qrCode);
      if (!res.success) {
        throw new Error(res.error || "Không thể tách bộ dụng cụ.");
      }

      toast.success("Tách bộ thành công!", {
        description: `Mã phụ: ${res.ma_vach_qr_phu}`,
      });

      // 2. Tự động chuyển sang lệnh in nhãn cho mã phụ
      // Đánh dấu tên bộ có chữ (SUB - Nhiệt thấp) để nhân viên dễ nhận diện
      printLabel({
        qrCode: res.ma_vach_qr_phu,
        tenBoDungCu: `${data.tenBoDungCu} (SUB - Nhạy nhiệt)`,
        tram: data.tram,
        nguoiThucHien: data.nguoiThucHien,
        thoiGian: data.thoiGian,
      });
    } catch (error: any) {
      toast.error("Lỗi tách bộ", {
        description: error.message || "Đã xảy ra sự cố trong quá trình tách.",
      });
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <button 
      onClick={handleSplitAndPrint}
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
