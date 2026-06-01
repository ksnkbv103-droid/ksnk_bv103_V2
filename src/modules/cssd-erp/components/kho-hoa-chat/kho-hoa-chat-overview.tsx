"use client";

import React from "react";
import { Beaker, CalendarClock, AlertTriangle, Settings2 } from "lucide-react";

type Dm = {
  id: string;
  ma_hoa_chat: string;
};

type Props = {
  countSapHetHan: number;
  countDuoiNguong: number;
  dms: Dm[];
  canEdit: boolean;
  thrDm: string;
  thrVal: string;
  onThrDm: (v: string) => void;
  onThrVal: (v: string) => void;
  onSaveThr: () => void;
};

export default function KhoHoaChatOverview({
  countSapHetHan,
  countDuoiNguong,
  dms,
  canEdit,
  thrDm,
  thrVal,
  onThrDm,
  onThrVal,
  onSaveThr,
}: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Hạn sử dụng */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hạn dùng ≤ 30 ngày</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{countSapHetHan} lô</p>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-amber-50/50 flex items-center justify-center text-amber-500 ${countSapHetHan > 0 ? "animate-pulse" : ""}`}>
          <CalendarClock size={20} />
        </div>
      </div>

      {/* Card 2: Dưới ngưỡng tồn */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dưới ngưỡng an toàn</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{countDuoiNguong} mục</p>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 ${countDuoiNguong > 0 ? "animate-pulse" : ""}`}>
          <AlertTriangle size={20} />
        </div>
      </div>

      {/* Card 3: Tổng số mặt hàng */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mặt hàng trong kho</p>
          <p className="text-2xl font-black text-[#026f17] mt-1">{dms.length} loại</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <Beaker size={20} />
        </div>
      </div>

      {/* Card 4: Form cấu hình nhanh */}
      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Settings2 size={13} className="text-slate-500" />
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Thiết lập ngưỡng an toàn</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <select 
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-slate-300"
            value={thrDm} 
            onChange={(e) => onThrDm(e.target.value)}
          >
            <option value="">Chọn HC/VT...</option>
            {dms.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ma_hoa_chat}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-300"
            placeholder="Số lượng"
            value={thrVal}
            onChange={(e) => onThrVal(e.target.value)}
            disabled={!canEdit || !thrDm}
          />
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-[#026f17] text-[#FFD700] hover:opacity-90 py-1.5 text-[10px] font-black uppercase shadow-sm transition-all active:scale-98 disabled:opacity-40"
          disabled={!canEdit || !thrDm}
          onClick={() => void onSaveThr()}
        >
          Lưu ngưỡng an toàn
        </button>
      </div>
    </div>
  );
}
