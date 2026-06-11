"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import type { HoaChatRow } from "../actions/hoa-chat.types";
import { saveHoaChatAction } from "../actions/hoa-chat.actions";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

function mapForm(row: HoaChatRow | null) {
  return {
    id: row?.id || "",
    ma_hoa_chat: String(row?.ma_hoa_chat || ""),
    ten_hoa_chat: String(row?.ten_hoa_chat || ""),
    loai_hoa_chat: String(row?.loai_hoa_chat || "HOA_CHAT"),
    don_vi_tinh: String(row?.don_vi_tinh || ""),
    quy_cach: String(row?.quy_cach || ""),
    nong_do: String(row?.nong_do || ""),
    han_su_dung: row?.han_su_dung ? String(row.han_su_dung).slice(0, 10) : "",
    ghi_chu: String(row?.ghi_chu || ""),
    is_active: row?.is_active !== false,
  };
}

export default function HoaChatFormModal({
  open,
  initialRow,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialRow: HoaChatRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = useMemo(() => mapForm(initialRow), [initialRow]);
  const [form, setForm] = useState(seed);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialRow?.id);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await saveHoaChatAction(form);
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không thể lưu hóa chất.");
    toast.success(isEdit ? "Đã cập nhật hóa chất." : "Đã thêm hóa chất.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md touch-manipulation pointer-events-auto">
      <form onSubmit={submit} className="bg-white w-full max-w-xl rounded-[var(--radius-shell)] p-8 space-y-4 shadow-2xl border-t-[6px] border-[var(--primary)] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4">
          <h3 className={C.modalTitleLight}>
            {isEdit ? "Cập nhật hóa chất" : "Thêm hóa chất"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Mã HC" required disabled={isEdit} value={form.ma_hoa_chat} onChange={(v) => setForm({ ...form, ma_hoa_chat: v.toUpperCase() })} />
          <BoDungCuTextField label="Tên hóa chất" required value={form.ten_hoa_chat} onChange={(v) => setForm({ ...form, ten_hoa_chat: v })} />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Loại hóa chất</label>
            <select value={form.loai_hoa_chat} onChange={(e) => setForm({ ...form, loai_hoa_chat: e.target.value })} className={C.controlInput}>
              <option value="HOA_CHAT">Hóa chất</option>
              <option value="VAT_TU">Vật tư</option>
              <option value="TEST">Test</option>
            </select>
          </div>
          <BoDungCuTextField label="Đơn vị tính" value={form.don_vi_tinh} onChange={(v) => setForm({ ...form, don_vi_tinh: v })} />
          <BoDungCuTextField label="Quy cách" value={form.quy_cach} onChange={(v) => setForm({ ...form, quy_cach: v })} />
          <BoDungCuTextField label="Nồng độ" value={form.nong_do} onChange={(v) => setForm({ ...form, nong_do: v })} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400 ml-1">Hạn sử dụng</label>
          <input type="date" value={form.han_su_dung} onChange={(e) => setForm({ ...form, han_su_dung: e.target.value })} className={C.controlInput} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400 ml-1">Ghi chú</label>
          <textarea value={form.ghi_chu} rows={3} onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })} className={C.textareaCompact} />
        </div>
        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />
        <button type="submit" disabled={loading} className={`w-full ${C.btnPrimaryBlock} disabled:opacity-60`}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}
