// src/modules/cssd-erp/components/station/StationCompleteButton.tsx
"use client";

import React from "react";
import { Printer } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";

interface Props {
  data: {
    qrCode: string;
    tenBoDungCu: string;
    maLo?: string;
    tram: string;
    nguoiThucHien: string;
    thoiGian: string;
  };
}

/**
 * Nút in nhãn QR chuyên dụng cho các trạm CSSD
 * Mobile-first, touch-optimized, Army colors (#026f17 + #FFD700).
 */
export default function StationCompleteButton({ data }: Props) {
  const { printLabel, isPrinting } = usePrint();

  return (
    <button 
      onClick={() => printLabel(data)}
      disabled={isPrinting}
      className="w-full h-14 bg-[#FFD700] text-[#026f17] rounded-[20px] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-yellow-900/10 active:scale-95 transition-all disabled:opacity-50 touch-manipulation pointer-events-auto -webkit-tap-highlight-color-transparent border-2 border-[#026f17]/10"
    >
      <Printer size={20} strokeWidth={2.5} />
      {isPrinting ? "ĐANG CHUẨN BỊ IN..." : "IN NHÃN QR NHIỆT"}
    </button>
  );
}
