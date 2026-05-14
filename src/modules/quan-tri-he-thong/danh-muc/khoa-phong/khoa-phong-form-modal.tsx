"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import type { KhoaPhongRow } from "../actions/khoa-phong.types";
import { saveKhoaPhongAction } from "../actions/khoa-phong.actions";

function mapForm(row: KhoaPhongRow | null) {
  return {
    id: row?.id || "",
    ma_danh_muc: String(row?.ma_danh_muc || ""),
    ten_danh_muc: String(row?.ten_danh_muc || ""),
    khoi_id: String(row?.khoi_id || ""),
    mo_ta_chuc_nang: String(row?.mo_ta_chuc_nang || ""),
    so_bac_si: Number(row?.so_bac_si || 0),
    so_dieu_duong: Number(row?.so_dieu_duong || 0),
    so_giuong_benh_thuong: Number(row?.so_giuong_benh_thuong || 0),
    so_giuong_cap_cuu: Number(row?.so_giuong_cap_cuu || 0),
    is_active: row?.is_active !== false,
  };
}

export default function KhoaPhongFormModal({
  open,
  initialRow,
  khoiOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialRow: KhoaPhongRow | null;
  khoiOptions: { id: string; ten_danh_muc: string }[];
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
    const result = await saveKhoaPhongAction(form);
    setLoading(false);
    if (!result.success) return toast.error(result.error || "Không thể lưu khoa phòng.");
    toast.success(isEdit ? "Đã cập nhật khoa phòng." : "Đã thêm khoa phòng.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md touch-manipulation pointer-events-auto">
      <form onSubmit={submit} className="bg-white w-full max-w-xl rounded-2xl p-8 space-y-4 shadow-2xl border-t-[6px] border-[#026f17] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-sm font-black text-[#026f17] uppercase tracking-widest">
            {isEdit ? "Cập nhật khoa phòng" : "Thêm khoa phòng"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Mã khoa" required disabled={isEdit} value={form.ma_danh_muc} onChange={(v) => setForm({ ...form, ma_danh_muc: v.toUpperCase() })} />
          <BoDungCuTextField label="Tên khoa phòng" required value={form.ten_danh_muc} onChange={(v) => setForm({ ...form, ten_danh_muc: v })} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Khối khoa</label>
          <select
            value={form.khoi_id}
            onChange={(e) => setForm({ ...form, khoi_id: e.target.value })}
            className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs"
          >
            <option value="">— Chọn khối —</option>
            {khoiOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.ten_danh_muc}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Số bác sĩ" type="number" value={String(form.so_bac_si)} onChange={(v) => setForm({ ...form, so_bac_si: Number(v || 0) })} />
          <BoDungCuTextField label="Số điều dưỡng" type="number" value={String(form.so_dieu_duong)} onChange={(v) => setForm({ ...form, so_dieu_duong: Number(v || 0) })} />
          <BoDungCuTextField label="Số giường bệnh thường" type="number" value={String(form.so_giuong_benh_thuong)} onChange={(v) => setForm({ ...form, so_giuong_benh_thuong: Number(v || 0) })} />
          <BoDungCuTextField label="Số giường cấp cứu" type="number" value={String(form.so_giuong_cap_cuu)} onChange={(v) => setForm({ ...form, so_giuong_cap_cuu: Number(v || 0) })} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mô tả chức năng khoa</label>
          <textarea
            value={form.mo_ta_chuc_nang}
            onChange={(e) => setForm({ ...form, mo_ta_chuc_nang: e.target.value })}
            rows={2}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-semibold text-xs resize-none"
          />
        </div>
        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} footnote="Khi Tắt, khoa/phòng thường không còn trong lựa chọn mặc định và báo cáo tổng hợp." />
        <button type="submit" disabled={loading} className="w-full h-12 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}
