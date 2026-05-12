"use client";

import React from "react";

type Props = {
  open: boolean;
  machines: { id: string; ma_thiet_bi: string; ten_thiet_bi: string }[];
  selTb: string;
  lyDo: string;
  onSelTb: (v: string) => void;
  onLyDo: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function BaoTriStartModal({ open, machines, selTb, lyDo, onSelTb, onLyDo, onClose, onSubmit }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Mở phiếu bảo trì</h2>
        <p className="mt-1 text-xs text-slate-500">Chỉ thiết bị sẵn sàng và không có mẻ TK chưa kết thúc QC.</p>
        <label className="mt-4 block text-[10px] font-black uppercase text-slate-500">Thiết bị</label>
        <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={selTb} onChange={(e) => onSelTb(e.target.value)}>
          <option value="">— Chọn —</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ma_thiet_bi} — {m.ten_thiet_bi}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Lý do / nội dung</label>
        <textarea className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={lyDo} onChange={(e) => onLyDo(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#026f17] px-4 py-2 text-sm font-semibold text-[#FFD700]"
            onClick={() => void onSubmit()}
            disabled={!selTb.trim() || !lyDo.trim()}
          >
            Bắt đầu bảo trì
          </button>
        </div>
      </div>
    </div>
  );
}
