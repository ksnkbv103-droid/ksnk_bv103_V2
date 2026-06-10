// src/modules/quan-tri-he-thong/bang-kiem/components/TieuChiForm.tsx
"use client";

import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import type { TieuChiBangKiem } from "../bang-kiem.types";
import { quanTriFormChrome as F } from "../../lib/quan-tri-form-chrome";

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
      <div className="bg-white w-full max-w-xl rounded-[var(--radius-shell)] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-10 py-8 bg-slate-50/50 flex items-center justify-between">
          <h2 className={F.modalTitleLight}>{formData.id ? "Sửa tiêu chí" : "Thêm tiêu chí mới"}</h2>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-[var(--radius-shell)] text-slate-400 shadow-sm"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className={F.formLabel}>STT</label>
              <input type="number" min={0} value={formData.stt} onChange={e => setFormData({...formData, stt: parseInt(e.target.value, 10) || 0})} className={F.controlInput} />
            </div>
            <div className="space-y-2">
              <label className={F.formLabel}>Mã tiêu chí</label>
              <input value={formData.ma_tc} onChange={e => setFormData({...formData, ma_tc: e.target.value})} className={F.controlInput} placeholder="TC01" />
            </div>
            <div className="space-y-2">
              <label className={F.formLabel}>Điểm tối đa</label>
              <input type="number" min={1} value={formData.diem_toi_da} onChange={e => setFormData({...formData, diem_toi_da: Math.max(1, parseInt(e.target.value, 10) || 1)})} className={F.controlInput} />
            </div>
          </div>

          <div className="space-y-2">
            <label className={F.formLabel}>Nội dung tiêu chí</label>
            <textarea value={formData.noi_dung} onChange={e => setFormData({...formData, noi_dung: e.target.value})} rows={4} className={F.textareaCompact} placeholder="Nhập nội dung tiêu chí kiểm tra…" />
          </div>

          <div className="space-y-2">
            <label className={F.formLabel}>Ghi chú hướng dẫn</label>
            <input value={formData.ghi_chu} onChange={e => setFormData({...formData, ghi_chu: e.target.value})} className={F.controlInput} placeholder="Nhập hướng dẫn chấm điểm…" />
          </div>

          <MdmFormActiveToggleRow active={formData.is_active} onChange={(next) => setFormData({ ...formData, is_active: next })} />
        </div>

        <footer className="px-10 py-8 bg-slate-50/50 flex items-center justify-end gap-4">
          <button type="button" onClick={onClose} className={`${F.ctaSecondary} ${F.modalFooterBtn}`}>Hủy bỏ</button>
          <button
            type="button"
            onClick={() => onSave({ ...formData, bangKiemId: formData.bang_kiem_id } as unknown as Record<string, unknown>)}
            className={`${F.ctaPrimary} gap-2 ${F.modalFooterBtn}`}
          >
            <Save className="w-4 h-4" /> Lưu tiêu chí
          </button>
        </footer>
      </div>
    </div>
  );
}
