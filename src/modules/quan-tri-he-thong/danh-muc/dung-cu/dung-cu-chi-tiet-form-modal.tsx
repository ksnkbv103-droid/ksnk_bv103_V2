"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "./bo-dung-cu-form-field";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import {
  DungCuChiTietFormValues,
  DungCuChiTietTableRow,
  mapChiTietRowToForm,
} from "./dung-cu-chi-tiet-form-shared";
import { saveDungCuChiTietAction } from "../actions/dung-cu-chi-tiet.actions";
import { LoaiDungCuTypeahead } from "./loai-dung-cu-typeahead";
import QuanTriFormDialogShell from "../../components/QuanTriFormDialogShell";

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
  loaiOptions: _loaiOptions,
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

  useEffect(() => {
    setForm(seed);
  }, [seed]);

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
    <QuanTriFormDialogShell
      open={open}
      onClose={onClose}
      title={isEdit ? "Cập nhật dụng cụ chi tiết" : "Thêm dụng cụ chi tiết"}
      subtitle="Gán vào bộ hoặc để trống bộ nếu là dụng cụ lẻ."
      size="md"
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${C.ctaSecondary} flex-1 ${C.modalFooterBtn}`} disabled={loading}>
            Hủy
          </button>
          <button type="submit" disabled={loading} className={`${C.ctaPrimary} flex-[2] ${C.modalFooterBtn}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
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
        <LoaiDungCuTypeahead
          label="Loại dụng cụ liên kết"
          valueId={form.loai_dung_cu_id}
          disabled={loadingLoai}
          onChange={(loaiId, found) =>
            setForm({
              ...form,
              loai_dung_cu_id: loaiId,
              ten_chi_tiet: form.ten_chi_tiet.trim() || String(found?.ten_danh_muc || ""),
            })
          }
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-400 ml-1">Bộ chủ quản</label>
        <select
          value={form.bo_dung_cu_id}
          onChange={(e) => setForm({ ...form, bo_dung_cu_id: e.target.value })}
          disabled={loadingBo}
          className={C.controlInput}
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
        <label className="text-[11px] font-medium text-slate-400 ml-1">Ghi chú</label>
        <textarea
          value={form.ghi_chu}
          rows={3}
          onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
          className={C.textareaCompact}
        />
      </div>
      <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />
    </QuanTriFormDialogShell>
  );
}
