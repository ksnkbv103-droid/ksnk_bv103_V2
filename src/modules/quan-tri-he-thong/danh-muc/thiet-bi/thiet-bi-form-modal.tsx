"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "../dung-cu/bo-dung-cu-form-field";
import ThietBiPrintQrButton from "@/modules/cssd-erp/components/equipment/thiet-bi-print-qr-button";
import { ThietBiLoaiMayField } from "./thiet-bi-loai-may-field";
import type { ThietBiRow } from "../actions/thiet-bi.types";
import { saveThietBiAction } from "../actions/thiet-bi.actions";
import { mapThietBiToForm, type ThietBiFormValues } from "./thiet-bi-form-shared";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

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
      serial_number: form.serial_number.trim(),
      model: form.model.trim(),
      vi_tri: form.vi_tri.trim(),
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
        className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[var(--radius-shell)] p-8 space-y-4 shadow-[var(--shadow-app-soft)] border-t-4 border-[var(--primary)]"
      >
        <div className="flex justify-between items-start gap-4">
          <h3 className={C.modalTitleLight}>
            {isEdit ? "Cập nhật thiết bị và máy" : "Thêm thiết bị và máy"}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <BoDungCuTextField label="Mã thiết bị" required disabled={isEdit} value={form.ma_thiet_bi}
              onChange={(v) => setForm({ ...form, ma_thiet_bi: v.toUpperCase() })} />
            <p className="text-[11px] leading-snug text-slate-500 ml-1">
              {isEdit
                ? "Mã này là mã QR in trên tem — gắn suốt vòng đời máy, không đổi sau khi tạo."
                : "Mã này sẽ trở thành mã QR trên tem dán máy. Chọn cẩn thận — không sửa được sau khi lưu."}
            </p>
          </div>
          <BoDungCuTextField label="Tên thiết bị" required value={form.ten_thiet_bi}
            onChange={(v) => setForm({ ...form, ten_thiet_bi: v })} />
          <ThietBiLoaiMayField value={form.loai_thiet_bi} onChange={(v) => setForm({ ...form, loai_thiet_bi: v })} />
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Trạng thái</label>
            <select
              value={form.trang_thai}
              disabled={form.trang_thai === "REPAIRING" || form.trang_thai === "BAO_TRI" || form.trang_thai === "BROKEN"}
              onChange={(e) => setForm({ ...form, trang_thai: e.target.value })}
              className={C.controlInput}
            >
              <option value="READY">Sẵn sàng</option>
              <option value="HOAT_DONG">Hoạt động</option>
              <option value="HOLD_QC">Tạm giữ QC</option>
              <option value="RETIRED">Ngừng sử dụng</option>
              {form.trang_thai === "REPAIRING" || form.trang_thai === "BAO_TRI" ? (
                <option value={form.trang_thai}>Đang sửa (phiếu bảo trì)</option>
              ) : null}
              {form.trang_thai === "BROKEN" ? <option value="BROKEN">Hỏng (phiếu bảo trì)</option> : null}
            </select>
            <p className="ml-1 text-[11px] text-slate-500">
              Đang sửa / hỏng: chỉ qua phiếu bảo trì. HOLD_QC = tạm giữ sau sự cố QC — không nạp mẻ.
            </p>
          </div>
          <BoDungCuTextField label="Hãng sản xuất" value={form.hang_san_xuat}
            onChange={(v) => setForm({ ...form, hang_san_xuat: v })} />
          <BoDungCuTextField label="Năm sản xuất" value={form.nam_san_xuat}
            onChange={(v) => setForm({ ...form, nam_san_xuat: v })} />
          <BoDungCuTextField label="Chu kỳ bảo trì (ngày)" value={form.chu_ky_bao_tri_ngay}
            onChange={(v) => setForm({ ...form, chu_ky_bao_tri_ngay: v })} />
          <BoDungCuTextField label="Số serial" value={form.serial_number}
            onChange={(v) => setForm({ ...form, serial_number: v })} />
          <BoDungCuTextField label="Model" value={form.model}
            onChange={(v) => setForm({ ...form, model: v })} />
          <BoDungCuTextField label="Vị trí / trạm" value={form.vi_tri}
            onChange={(v) => setForm({ ...form, vi_tri: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DateField label="Ngày đưa vào sử dụng" value={form.ngay_dua_vao_su_dung} onChange={(v) => setForm({ ...form, ngay_dua_vao_su_dung: v })} />
          <DateField label="Bảo trì gần nhất (từ phiếu)" value={form.ngay_bao_tri_gan_nhat} readOnly />
          <DateField label="Bảo trì tiếp theo (từ phiếu)" value={form.ngay_bao_tri_tiep_theo} readOnly />
        </div>

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

        {isEdit && form.ma_thiet_bi.trim() && initialRow?.id ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
              Tem QR vật lý
            </p>
            <p className="text-[11px] text-slate-600">
              In tem dán lên máy để quét nhanh khi bảo trì, vận hành hoặc báo sự cố.
            </p>
            <ThietBiPrintQrButton
              thietBiId={initialRow.id}
              maThietBi={form.ma_thiet_bi}
              tenThietBi={form.ten_thiet_bi}
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${C.btnPrimaryBlock} disabled:opacity-60`}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-400 ml-1">{label}</label>
      <input
        type="date"
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`${C.controlInput} ${readOnly ? "bg-slate-50 text-slate-500" : ""}`}
      />
    </div>
  );
}
