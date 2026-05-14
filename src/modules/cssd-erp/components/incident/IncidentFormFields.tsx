// src/modules/cssd-erp/components/incident/IncidentFormFields.tsx
"use client";

import React from "react";
import { QrCode, Camera, FileText } from "lucide-react";

interface Props {
  typeTen: string;
  formData: any;
  onChange: (field: string, value: string) => void;
  machines: { id: string; ten: string }[];
}

/**
 * Component render trường dữ liệu động (Hybrid EAV)
 * Tách riêng để code tinh gọn, dễ bảo trì (≤ 180 dòng).
 */
export default function IncidentFormFields({ typeTen, formData, onChange, machines }: Props) {
  const isDungCu = typeTen.toUpperCase().includes("DỤNG CỤ");
  const isMay = typeTen.toUpperCase().includes("MÁY");

  return (
    <div className="space-y-5 p-5 bg-slate-50 rounded-[32px] border-2 border-slate-100 animate-in slide-in-from-top-2">
      {/* 1. Trường hợp Lỗi máy móc */}
      {isMay && (
        <div className="space-y-1.5 px-1">
          <label className="text-[10px] font-black text-[#026f17] uppercase tracking-widest">Chọn thiết bị gặp lỗi</label>
          <select 
            value={formData.machineId || ""} 
            onChange={e => onChange("machineId", e.target.value)} 
            className="w-full h-14 px-5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-red-400"
          >
            <option value="">-- Chọn máy --</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.ten}</option>)}
          </select>
        </div>
      )}

      {/* 2. Trường hợp Lỗi dụng cụ */}
      {isDungCu && (
        <div className="space-y-1.5 px-1">
          <label className="text-[10px] font-black text-[#026f17] uppercase tracking-widest">Quét QR dụng cụ lỗi</label>
          <div className="relative group">
            <input 
              value={formData.errorQR || ""} 
              onChange={e => onChange("errorQR", e.target.value.toUpperCase())} 
              className="w-full h-14 pl-5 pr-12 bg-white border-2 border-slate-100 rounded-2xl font-black text-red-600 outline-none focus:border-red-400" 
              placeholder="MÃ DỤNG CỤ..." 
            />
            <QrCode className="absolute right-4 top-4 text-slate-300 group-focus-within:text-red-500 transition-all" size={20} />
          </div>
        </div>
      )}

      {/* 3. Mô tả chi tiết */}
      <div className="space-y-1.5 px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả tình huống</label>
        <div className="relative">
          <textarea 
            value={formData.desc || ""} 
            onChange={e => onChange("desc", e.target.value)} 
            rows={3} 
            className="w-full p-5 bg-white border-2 border-slate-100 rounded-[24px] font-medium text-slate-600 outline-none focus:border-red-400 text-sm resize-none" 
            placeholder="Diễn giải lỗi..." 
          />
          <FileText className="absolute right-4 top-4 text-slate-200" size={20} />
        </div>
      </div>

      {/* 4. Ảnh minh chứng */}
      <button type="button" className="w-full h-14 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 text-[10px] font-bold uppercase active:bg-slate-100 transition-all">
        <Camera size={20} /> Chụp ảnh minh chứng
      </button>
    </div>
  );
}
