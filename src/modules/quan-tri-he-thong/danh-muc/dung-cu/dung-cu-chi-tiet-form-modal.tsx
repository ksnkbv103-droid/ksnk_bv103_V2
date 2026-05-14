"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "./bo-dung-cu-form-field";
import {
  DungCuChiTietFormValues,
  DungCuChiTietTableRow,
  mapChiTietRowToForm,
} from "./dung-cu-chi-tiet-form-shared";
import { saveDungCuChiTietAction } from "../actions/dung-cu-chi-tiet.actions";

type BoOpt = { id: string; ma_bo: string | null; ten_bo: string | null };
type LoaiOpt = { id: string; ma_danh_muc: string | null; ten_danh_muc: string | null };
interface Props {
  open: boolean;
  initialRow: DungCuChiTietTableRow | null;
  presetBoId?: string | null;
  presetLoaiId?: string | null;
  boOptions: BoOpt[];
  loaiOptions: LoaiOpt[];
  loadingBo: boolean;
  loadingLoai: boolean;
  onClose: () => void;
  onSaved: () => void;
}
/** Modal thêm/sửa chi tiết dụng cụ trong bộ hoặc dụng cụ lẻ (bo trống). */
export default function DungCuChiTietFormModal({
  open,
  initialRow,
  presetBoId,
  presetLoaiId,
  boOptions,
  loaiOptions,
  loadingBo,
  loadingLoai,
  onClose,
  onSaved,
}: Props) {
  const seed = useMemo(() => {
    const base = mapChiTietRowToForm(initialRow);
    if (!initialRow && presetBoId) base.bo_dung_cu_id = String(presetBoId);
    if (!initialRow && presetLoaiId) base.loai_dung_cu_id = String(presetLoaiId);
    return base;
  }, [initialRow, presetBoId, presetLoaiId]);
  const [form, setForm] = useState<DungCuChiTietFormValues>(seed);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialRow?.id);
  if (!open) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ma = form.ma_chi_tiet.trim();
    const ten = form.ten_chi_tiet.trim();
    if (!ma || (!ten && !form.loai_dung_cu_id.trim())) {
      toast.error("Vui lòng nhập mã và tên, hoặc chọn loại dụng cụ.");
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      id: initialRow?.id,
      ma_chi_tiet: ma.toUpperCase(),
      ten_chi_tiet: ten,
      bo_dung_cu_id: form.bo_dung_cu_id.trim() || null,
      loai_dung_cu_id: form.loai_dung_cu_id.trim() || null,
      so_luong: form.so_luong.trim() || "1",
      max_suds_count: form.max_suds_count.trim(),
      trong_luong: form.trong_luong.trim(),
      ghi_chu: form.ghi_chu.trim(),
      ma_qr_mau: form.ma_qr_mau.trim(),
      is_active: form.is_active,
    };
    const result = await saveDungCuChiTietAction(payload);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Không lưu được chi tiết dụng cụ.");
      return;
    }
    toast.success(isEdit ? "Đã cập nhật chi tiết." : "Đã thêm chi tiết dụng cụ.");
    onSaved();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md touch-manipulation pointer-events-auto">
      <form
        onSubmit={submit}
        className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl p-8 space-y-4 shadow-2xl border-t-[6px] border-[#026f17]"
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-sm font-black text-[#026f17] uppercase tracking-widest">
              {isEdit ? "Cập nhật dụng cụ chi tiết" : "Thêm dụng cụ chi tiết"}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Gán vào bộ hoặc để trống bộ nếu là dụng cụ lẻ.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BoDungCuTextField
            label="Mã chi tiết"
            required
            disabled={isEdit}
            value={form.ma_chi_tiet}
            onChange={(v) => setForm({ ...form, ma_chi_tiet: v.toUpperCase() })}
          />
          <BoDungCuTextField
            label="Tên chi tiết"
            value={form.ten_chi_tiet}
            onChange={(v) => setForm({ ...form, ten_chi_tiet: v })}
          />
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Loại dụng cụ liên kết</label>
            <select
              value={form.loai_dung_cu_id}
              onChange={(e) => {
                const loaiId = e.target.value; const found = loaiOptions.find((x) => x.id === loaiId);
                setForm({ ...form, loai_dung_cu_id: loaiId, ten_chi_tiet: form.ten_chi_tiet.trim() || String(found?.ten_danh_muc || "") });
              }}
              disabled={loadingLoai}
              className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs disabled:opacity-60"
            >
              <option value="">— Chọn loại (khuyến nghị) —</option>
              {loaiOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.ma_danh_muc} — {o.ten_danh_muc || "—"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Bộ chủ quản</label>
          <select
            value={form.bo_dung_cu_id}
            onChange={(e) => setForm({ ...form, bo_dung_cu_id: e.target.value })}
            disabled={loadingBo}
            className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs disabled:opacity-60"
          >
            <option value="">— Dụng cụ lẻ (không thuộc bộ) —</option>
            {boOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ma_bo} — {o.ten_bo || "—"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <BoDungCuTextField
            label="Số lượng trong bộ"
            value={form.so_luong}
            onChange={(v) => setForm({ ...form, so_luong: v })}
          />
          <BoDungCuTextField
            label="Giới hạn SUD"
            value={form.max_suds_count}
            onChange={(v) => setForm({ ...form, max_suds_count: v })}
          />
          <BoDungCuTextField label="Trọng lượng" value={form.trong_luong} onChange={(v) => setForm({ ...form, trong_luong: v })} />
        </div>
        <BoDungCuTextField label="Mã QR mẫu (tùy chọn)" value={form.ma_qr_mau} onChange={(v) => setForm({ ...form, ma_qr_mau: v })} />
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Ghi chú</label>
          <textarea
            value={form.ghi_chu}
            rows={3}
            onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-xs min-h-[80px]"
          />
        </div>
        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />
        <button type="submit" disabled={loading} className="w-full h-12 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 disabled:opacity-60 touch-manipulation">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}
