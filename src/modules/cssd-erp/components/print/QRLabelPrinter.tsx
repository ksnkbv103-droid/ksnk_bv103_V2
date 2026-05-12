// src/modules/cssd-erp/components/print/QRLabelPrinter.tsx
"use client";

import React from "react";
import { Printer } from "lucide-react";
import { format } from "date-fns";

interface Props {
  quyTrinhId: string;
  qrCode: string;
  tenBoDungCu: string;
  tramHienTai: string;
  nguoiThucHien: string;
}

/**
 * Component in nhãn QR chuẩn thermal printer (A6/Label) cho CSSD ERP
 */
export default function QRLabelPrinter({ qrCode, tenBoDungCu, tramHienTai, nguoiThucHien }: Props) {
  const now = new Date();
  
  // Sử dụng QR Server API để tạo mã QR mà không cần thêm thư viện
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrCode}`;

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-[40px] shadow-2xl border border-slate-100 touch-manipulation pointer-events-auto">
      {/* 1. Giao diện xem trước (Preview) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#026f17] font-black uppercase text-xs tracking-widest">
            <Printer size={18} /> Xem trước nhãn in
          </div>
          <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
            Nhãn Nhiệt A6
          </div>
        </div>

        <div className="relative bg-slate-50 p-8 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-6 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-[#026f17] to-red-500 opacity-20" />
          
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100">
            <img src={qrUrl} alt="QR Code Preview" className="w-44 h-44 object-contain" />
          </div>

          <div className="text-center space-y-2">
            <div className="font-black text-red-600 text-3xl tracking-tighter uppercase">{qrCode}</div>
            <div className="font-bold text-slate-800 text-xl leading-tight">{tenBoDungCu}</div>
            <div className="inline-block bg-[#026f17]/10 text-[#026f17] px-4 py-1.5 rounded-xl text-xs font-black uppercase">
              Trạm: {tramHienTai}
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 text-[11px] font-bold text-slate-500 uppercase">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-400">Người thực hiện</span>
            <span className="text-slate-900 truncate">{nguoiThucHien}</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-[9px] text-slate-400">Ngày giờ in</span>
            <span className="text-slate-900">{format(now, "HH:mm - dd/MM/yyyy")}</span>
          </div>
        </div>

        <button 
          onClick={() => window.print()}
          className="w-full py-6 bg-[#026f17] text-[#FFD700] rounded-[28px] font-black uppercase text-xs tracking-[0.25em] shadow-2xl shadow-[#026f17]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 -webkit-tap-highlight-color-transparent"
        >
          <Printer size={20} /> In Nhãn QR Ngay
        </button>
      </div>

      {/* 2. Vùng in ẩn (Chỉ hiện khi in) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
        <div className="w-[100mm] h-[150mm] mx-auto p-6 flex flex-col items-center justify-center text-black border-[3px] border-black text-center">
          <div className="mb-6">
            <div className="text-xl font-black uppercase tracking-widest leading-none">BỆNH VIỆN QUÂN Y 103</div>
            <div className="text-[10px] font-bold mt-1 uppercase">Khoa Kiểm soát nhiễm khuẩn</div>
          </div>

          <div className="border-[4px] border-black p-4 mb-6">
            <img src={qrUrl} alt="QR Code Print" className="w-[65mm] h-[65mm] object-contain" />
          </div>

          <div className="w-full space-y-4">
            <div className="text-5xl font-black tracking-tighter">{qrCode}</div>
            <div className="text-2xl font-bold uppercase border-y-2 border-black py-2">{tenBoDungCu}</div>
            
            <div className="grid grid-cols-2 gap-2 text-sm font-bold uppercase mt-4">
              <div className="text-left">Trạm: {tramHienTai}</div>
              <div className="text-right">{format(now, "HH:mm dd/MM/yyyy")}</div>
            </div>
            <div className="text-[12px] font-medium italic mt-2">Người thực hiện: {nguoiThucHien}</div>
          </div>
        </div>
        
        {/* CSS Scoped cho việc in ấn nhãn nhỏ */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: 100mm 150mm; margin: 0; }
            body * { visibility: hidden; }
            .print\\:block, .print\\:block * { visibility: visible; }
            .print\\:block { 
              position: absolute; 
              left: 0; top: 0; 
              width: 100mm; height: 150mm; 
              display: flex !important;
            }
          }
        `}} />
      </div>
    </div>
  );
}
