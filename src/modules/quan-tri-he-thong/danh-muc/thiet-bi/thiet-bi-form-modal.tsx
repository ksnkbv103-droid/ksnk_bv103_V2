"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import { ThietBiLoaiMayField } from "./thiet-bi-loai-may-field";
import type { ThietBiRow } from "../actions/thiet-bi.types";
import { saveThietBiAction } from "../actions/thiet-bi.actions";
import { mapThietBiToForm, type ThietBiFormValues } from "./thiet-bi-form-shared";

export default function ThietBiFormModal({
  open,
  initialRow,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialRow: ThietBiRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = useMemo(() => mapThietBiToForm(initialRow), [initialRow]);
  const [form, setForm] = useState<ThietBiFormValues>(seed);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialRow?.id);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ma = form.ma_thiet_bi.trim();
    const ten = form.ten_thiet_bi.trim();
    if (!ma || !ten) {
      toast.error("Vui lòng nhập mã và tên thiết bị.");
      return;
    }

    setLoading(true);
    const result = await saveThietBiAction({
      id: initialRow?.id,
      ma_thiet_bi: ma.toUpperCase(),
      ten_thiet_bi: ten,
      loai_thiet_bi: form.loai_thiet_bi.trim(),
      trang_thai: form.trang_thai,
      hang_san_xuat: form.hang_san_xuat.trim(),
      nam_san_xuat: form.nam_san_xuat.trim(),
      ngay_dua_vao_su_dung: form.ngay_dua_vao_su_dung,
      chu_ky_bao_tri_ngay: form.chu_ky_bao_tri_ngay.trim(),
      ngay_bao_tri_gan_nhat: form.ngay_bao_tri_gan_nhat,
      ngay_bao_tri_tiep_theo: form.ngay_bao_tri_tiep_theo,
      ghi_chu: form.ghi_chu,
      is_active: form.is_active,
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Không thể lưu thiết bị.");
      return;
    }
    toast.success(isEdit ? "Đã cập nhật thiết bị." : "Đã thêm thiết bị.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md touch-manipulation pointer-events-auto">
      <form
        onSubmit={submit}
        className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-8 space-y-4 shadow-2xl border-t-[6px] border-[#026f17]"
      >
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-sm font-black text-[#026f17] uppercase tracking-widest">
            {isEdit ? "Cập nhật thiết bị và máy" : "Thêm thiết bị và máy"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Mã thiết bị" required disabled={isEdit} value={form.ma_thiet_bi}
            onChange={(v) => setForm({ ...form, ma_thiet_bi: v.toUpperCase() })} />
          <BoDungCuTextField label="Tên thiết bị" required value={form.ten_thiet_bi}
            onChange={(v) => setForm({ ...form, ten_thiet_bi: v })} />
          <ThietBiLoaiMayField value={form.loai_thiet_bi} onChange={(v) => setForm({ ...form, loai_thiet_bi: v })} />
          <div className="space-y-1">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Trạng thái</label>
            <select value={form.trang_thai} onChange={(e) => setForm({ ...form, trang_thai: e.target.value })} className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs">
              <option value="READY">Sẵn sàng</option>
              <option value="REPAIRING">Đang sửa chữa</option>
              <option value="BROKEN">Hỏng</option>
              <option value="RETIRED">Ngừng sử dụng</option>
            </select>
          </div>
          <BoDungCuTextField label="Hãng sản xuất" value={form.hang_san_xuat}
            onChange={(v) => setForm({ ...form, hang_san_xuat: v })} />
          <BoDungCuTextField label="Năm sản xuất" value={form.nam_san_xuat}
            onChange={(v) => setForm({ ...form, nam_san_xuat: v })} />
          <BoDungCuTextField label="Chu kỳ bảo trì (ngày)" value={form.chu_ky_bao_tri_ngay}
            onChange={(v) => setForm({ ...form, chu_ky_bao_tri_ngay: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DateField label="Ngày đưa vào sử dụng" value={form.ngay_dua_vao_su_dung} onChange={(v) => setForm({ ...form, ngay_dua_vao_su_dung: v })} />
          <DateField label="Bảo trì gần nhất" value={form.ngay_bao_tri_gan_nhat} onChange={(v) => setForm({ ...form, ngay_bao_tri_gan_nhat: v })} />
          <DateField label="Bảo trì tiếp theo" value={form.ngay_bao_tri_tiep_theo} onChange={(v) => setForm({ ...form, ngay_bao_tri_tiep_theo: v })} />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Ghi chú</label>
          <textarea
            value={form.ghi_chu}
            rows={3}
            onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-xs min-h-[80px]"
          />
        </div>

        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs"
      />
    </div>
  );
}
