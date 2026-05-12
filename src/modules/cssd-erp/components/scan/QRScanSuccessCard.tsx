// src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx
"use client";

import React from "react";
import { CheckCircle2, User, Clock, ArrowRight } from "lucide-react";
import StationCompleteButton from "../station/StationCompleteButton";

interface Props {
  qrCode: string;
  tenBoDungCu: string;
  nguoiThucHien: string;
  thoiGianQuet: string;
  buocTiepTheo: string;
  /** Trạm hiện tại (từ trang cha; tránh gọi hook trùng state). */
  tramDisplay?: string;
  maCaMoId?: string;
}

/**
 * Thẻ thông báo quét thành công (Phiên bản Gọn & Cân đối)
 * Tông màu Quân y (#026f17 + #FFD700), tối ưu không gian hiển thị.
 */
export default function QRScanSuccessCard({
  qrCode,
  tenBoDungCu,
  nguoiThucHien,
  thoiGianQuet,
  buocTiepTheo,
  tramDisplay = "CSSD",
  maCaMoId,
}: Props) {
  return (
    <div className="w-full max-w-[360px] mx-auto animate-in zoom-in-95 duration-200 touch-manipulation pointer-events-auto -webkit-tap-highlight-color-transparent">
      <div className="bg-[#026f17] rounded-[32px] overflow-hidden shadow-xl border-2 border-[#FFD700]/20 relative">
        {/* Họa tiết nền chìm */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#FFD700_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="p-5 flex flex-col items-center text-center relative z-10">
          {/* Biểu tượng trạng thái nhỏ gọn */}
          <div className="mb-4 bg-[#FFD700] p-3 rounded-full shadow-lg">
            <CheckCircle2 className="text-[#026f17]" size={32} strokeWidth={3} />
          </div>

          <h2 className="text-[#FFD700] text-lg font-black uppercase tracking-tight mb-1">
            QUÉT THÀNH CÔNG
          </h2>
          <p className="text-white/50 text-[9px] font-bold uppercase tracking-[0.2em] mb-6">
            Hệ thống đã ghi nhận bản ghi
          </p>

          {/* Khối nội dung chính */}
          <div className="w-full bg-white/5 backdrop-blur-md rounded-[24px] p-4 border border-white/10 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-lg border-2 border-white">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrCode}`} 
                  alt="QR" 
                  className="w-28 h-28 object-contain"
                />
              </div>
              <div className="font-black text-[#FFD700] text-xl tracking-[0.1em]">
                {qrCode}
              </div>
            </div>

            <div className="h-px bg-white/10 w-full" />

            <div className="space-y-4 text-left px-1">
              <div className="space-y-0.5">
                <label className="text-[9px] font-black text-[#FFD700]/40 uppercase tracking-widest">
                  Bộ dụng cụ
                </label>
                <div className="text-white text-base font-black uppercase leading-tight">
                  {tenBoDungCu}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#FFD700]/40 uppercase">
                    <User size={10} /> Người thực hiện
                  </div>
                  <div className="text-white text-[11px] font-black truncate">{nguoiThucHien}</div>
                </div>
                <div className="space-y-0.5 border-l border-white/10 pl-3">
                  <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#FFD700]/40 uppercase">
                    <Clock size={10} /> Thời gian
                  </div>
                  <div className="text-white text-[11px] font-black">{thoiGianQuet}</div>
                </div>
              </div>
            </div>

            {maCaMoId && (
              <div className="w-full bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl p-3 animate-in fade-in slide-in-from-bottom-1">
                <label className="text-[8px] font-black text-[#FFD700] uppercase tracking-widest block mb-1">Truy vết Ca mổ / Bệnh nhân</label>
                <div className="text-white text-xs font-black uppercase">{maCaMoId}</div>
              </div>
            )}
          </div>

          {/* Banner chỉ dẫn bước tiếp theo */}
          <div className="mt-6 w-full bg-[#FFD700] text-[#026f17] p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="text-left">
              <div className="text-[8px] font-black uppercase opacity-60 mb-0.5">Bước tiếp theo</div>
              <div className="text-sm font-black uppercase tracking-tight">{buocTiepTheo}</div>
            </div>
            <div className="bg-[#026f17] p-2 rounded-full text-[#FFD700]"><ArrowRight size={20} strokeWidth={3} /></div>
          </div>

          {/* Nút In Nhãn QR Nhiệt (Mới thêm) */}
          <div className="mt-4 w-full">
            <StationCompleteButton 
              data={{
                qrCode,
                tenBoDungCu,
                tram: tramDisplay,
                nguoiThucHien,
                thoiGian: thoiGianQuet
              }} 
            />
          </div>
        </div>
      </div>
    </div>

  );
}
