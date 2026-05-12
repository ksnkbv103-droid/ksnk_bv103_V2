"use client";

import React from "react";
import { Beaker } from "lucide-react";

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
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-center shadow-sm">
        <div className="text-[10px] font-black uppercase text-amber-800">Lô có HSD ≤ 30 ngày (đang có tồn)</div>
        <div className="mt-2 text-2xl font-black text-amber-900">{countSapHetHan}</div>
        <Beaker className="mx-auto mt-2 h-6 w-6 text-amber-600 opacity-70" aria-hidden />
      </div>
      <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4 text-center shadow-sm">
        <div className="text-[10px] font-black uppercase text-red-800">Mặt hàng có tồn ≤ ngưỡng đã nhập</div>
        <div className="mt-2 text-2xl font-black text-red-900">{countDuoiNguong}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[10px] font-black uppercase text-slate-500">Đặt ngưỡng cảnh báo (theo DM)</div>
        <select className="mt-2 w-full rounded-lg border px-2 py-1 text-xs" value={thrDm} onChange={(e) => onThrDm(e.target.value)}>
          <option value="">Chọn HC/VT...</option>
          {dms.map((d) => (
            <option key={d.id} value={d.id}>
              {d.ma_hoa_chat}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="mt-2 w-full rounded-lg border px-2 py-1 text-xs"
          placeholder="Để trống = xoá ngưỡng"
          value={thrVal}
          onChange={(e) => onThrVal(e.target.value)}
          disabled={!canEdit || !thrDm}
        />
        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40"
          disabled={!canEdit || !thrDm}
          onClick={() => void onSaveThr()}
        >
          Lưu ngưỡng
        </button>
      </div>
    </div>
  );
}
