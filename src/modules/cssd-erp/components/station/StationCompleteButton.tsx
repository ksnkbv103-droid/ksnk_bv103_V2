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
  isMissing?: boolean;
  missingSummary?: string;
}

/**
 * Nút in nhãn QR chuyên dụng cho các trạm CSSD
 * Mobile-first, touch-optimized, Army colors (#026f17 + #FFD700).
 */
export default function StationCompleteButton({ data, isMissing, missingSummary }: Props) {
  const { printLabel, isPrinting } = usePrint();

  const handlePrint = () => {
    const finalSetName = isMissing && missingSummary
      ? `${data.tenBoDungCu} \n(⚠️ THIẾU: ${missingSummary})`
      : data.tenBoDungCu;
      
    void printLabel({
      ...data,
      tenBoDungCu: finalSetName
    });
  };

  return (
    <button 
      onClick={handlePrint}
      disabled={isPrinting}
      className={`w-full h-14 rounded-[20px] flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 touch-manipulation pointer-events-auto -webkit-tap-highlight-color-transparent border-2 ${
        isMissing 
          ? "bg-red-600 text-white border-red-700 shadow-red-900/10"
          : "bg-[#FFD700] text-[#026f17] border-[#026f17]/10 shadow-yellow-900/10"
      }`}
    >
      <Printer size={20} strokeWidth={2.5} />
      {isPrinting 
        ? "ĐANG CHUẨN BỊ IN..." 
        : isMissing 
          ? "⚠️ IN NHÃN BỘ THIẾU" 
          : "IN NHÃN QR NHIỆT"}
    </button>
  );
}

