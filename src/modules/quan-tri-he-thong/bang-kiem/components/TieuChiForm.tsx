// src/modules/quan-tri-he-thong/bang-kiem/components/TieuChiForm.tsx
"use client";

import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import type { TieuChiBangKiem } from "../bang-kiem.types";

interface Props {
  initialData?: Partial<TieuChiBangKiem> | null;
  bangKiemId: string;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

type TieuChiFormState = {
  id: string | null;
  bang_kiem_id: string;
  stt: number;
  ma_tc: string;
  noi_dung: string;
  ghi_chu: string;
  diem_toi_da: number;
  is_active: boolean;
};

export default function TieuChiForm({ initialData, bangKiemId, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<TieuChiFormState>(() => ({
    id: initialData?.id || null,
    bang_kiem_id: bangKiemId,
    stt: Number(initialData?.stt ?? 0),
    ma_tc: String(initialData?.ma_tc ?? ""),
    noi_dung: String(initialData?.noi_dung ?? ""),
    ghi_chu: String(initialData?.ghi_chu ?? ""),
    diem_toi_da: Number(initialData?.diem_toi_da ?? 1),
    is_active: initialData?.is_active ?? true,
  }));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-10 py-8 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{formData.id ? "Sửa Tiêu Chí" : "Thêm Tiêu Chí Mới"}</h2>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 shadow-sm"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">STT</label>
              <input type="number" min={0} value={formData.stt} onChange={e => setFormData({...formData, stt: parseInt(e.target.value, 10) || 0})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã tiêu chí</label>
              <input value={formData.ma_tc} onChange={e => setFormData({...formData, ma_tc: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none transition-all" placeholder="TC01" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Điểm tối đa</label>
              <input type="number" min={1} value={formData.diem_toi_da} onChange={e => setFormData({...formData, diem_toi_da: Math.max(1, parseInt(e.target.value, 10) || 1)})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung tiêu chí</label>
            <textarea value={formData.noi_dung} onChange={e => setFormData({...formData, noi_dung: e.target.value})} rows={4} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none transition-all resize-none" placeholder="Nhập nội dung tiêu chí kiểm tra..." />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú hướng dẫn</label>
            <input value={formData.ghi_chu} onChange={e => setFormData({...formData, ghi_chu: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none transition-all" placeholder="Nhập hướng dẫn chấm điểm..." />
          </div>

          <MdmFormActiveToggleRow active={formData.is_active} onChange={(next) => setFormData({ ...formData, is_active: next })} />
        </div>

        <footer className="px-10 py-8 bg-slate-50/50 flex items-center justify-end gap-4">
          <button onClick={onClose} className="px-8 py-3 bg-white text-slate-400 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-100">Hủy bỏ</button>
          <button
            type="button"
            onClick={() => onSave({ ...formData, bangKiemId: formData.bang_kiem_id } as unknown as Record<string, unknown>)}
            className="flex items-center gap-3 px-10 py-3 bg-[#026f17] text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#026f17]/20 hover:scale-105 transition-all"
          >
            <Save className="w-4 h-4" /> Lưu tiêu chí
          </button>
        </footer>
      </div>
    </div>
  );
}
