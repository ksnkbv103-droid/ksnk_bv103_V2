"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import BoDungCuTextField from "./bo-dung-cu-form-field";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { BoDungCuFormValues, BoDungCuTableRow, mapBoDungCuRowToForm } from "./bo-dung-cu-form-shared";
import { saveBoDungCuAction } from "../actions/bo-dung-cu.actions";

interface Props {
  open: boolean;
  initialRow: BoDungCuTableRow | null;
  loaiOptions: { id: string; ten_danh_muc: string }[];
  khoaOptions: { id: string; ten_khoa: string }[];
  loadingLoai: boolean;
  loadingKhoa: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function BoDungCuFormModal({ open, initialRow, loaiOptions, khoaOptions, loadingLoai, loadingKhoa, onClose, onSaved }: Props) {
  const formSeed = useMemo(() => mapBoDungCuRowToForm(initialRow), [initialRow]);
  const [form, setForm] = useState<BoDungCuFormValues>(formSeed);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialRow?.id);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ma_bo = form.ma_bo.trim();
    const ten_bo = form.ten_bo.trim();
    if (!ma_bo || !ten_bo) {
      toast.error("Vui lòng nhập đủ mã và tên bộ dụng cụ.");
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      id: initialRow?.id,
      ma_bo: ma_bo.toUpperCase(),
      ten_bo,
      loai_dung_cu_id: form.loai_dung_cu_id.trim() ? form.loai_dung_cu_id.trim() : null,
      khoa_su_dung_id: form.khoa_su_dung_id.trim() ? form.khoa_su_dung_id.trim() : null,
      quy_cach: form.quy_cach.trim() || null,
      ghi_chu: form.ghi_chu.trim() || null,
      trang_thai: form.trang_thai.trim() || "ACTIVE",
      ngay_kiem_ke_gan_nhat: form.ngay_kiem_ke_gan_nhat
        ? new Date(form.ngay_kiem_ke_gan_nhat).toISOString()
        : null,
      phan_loai_bo: form.phan_loai_bo,
      co_ma_dinh_danh_rieng: form.co_ma_dinh_danh_rieng,
      is_active: form.is_active,
    };
    const result = await saveBoDungCuAction(payload);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Không thể lưu bộ dụng cụ.");
      return;
    }
    toast.success(isEdit ? "Đã cập nhật bộ dụng cụ." : "Đã thêm bộ dụng cụ.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md touch-manipulation pointer-events-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-shell)] p-8 space-y-4 shadow-2xl border-t-[6px] border-[var(--primary)]"
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className={C.modalTitleLight}>
              {isEdit ? "Cập nhật bộ dụng cụ" : "Thêm bộ dụng cụ"}
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Điền thông tin theo dữ liệu master kho và phân loại.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 rounded-xl -mr-2">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BoDungCuTextField label="Mã bộ" required value={form.ma_bo} disabled={isEdit}
            onChange={(v) => setForm({ ...form, ma_bo: v.toUpperCase() })} />
          <BoDungCuTextField label="Tên bộ" required value={form.ten_bo}
            onChange={(v) => setForm({ ...form, ten_bo: v })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Loại dụng cụ</label>
            <select
              value={form.loai_dung_cu_id}
              onChange={(e) => setForm({ ...form, loai_dung_cu_id: e.target.value })}
              disabled={loadingLoai}
              className={C.controlInput}
            >
              <option value="">— Chọn loại và hình thức —</option>
              {loaiOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.ten_danh_muc}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Khoa sử dụng chính</label>
            <select
              value={form.khoa_su_dung_id}
              onChange={(e) => setForm({ ...form, khoa_su_dung_id: e.target.value })}
              disabled={loadingKhoa}
              className={C.controlInput}
            >
              <option value="">— Chọn khoa sử dụng —</option>
              {khoaOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.ten_khoa}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Phân loại bộ dụng cụ</label>
            <select
              value={form.phan_loai_bo}
              onChange={(e) => setForm({ ...form, phan_loai_bo: e.target.value })}
              className={C.controlInput}
            >
              <option value="PHAU_THUAT">Bộ dụng cụ Phẫu thuật</option>
              <option value="THU_THUAT">Bộ dụng cụ Thủ thuật</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Cơ chế theo dõi</label>
            <select
              value={form.co_ma_dinh_danh_rieng ? "true" : "false"}
              onChange={(e) => setForm({ ...form, co_ma_dinh_danh_rieng: e.target.value === "true" })}
              className={C.controlInput}
            >
              <option value="true">Theo mã QR/Vòng đời riêng</option>
              <option value="false">Cơ số chung (không dán nhãn riêng)</option>
            </select>
          </div>
        </div>

        <BoDungCuTextField label="Quy cách" value={form.quy_cach} onChange={(v) => setForm({ ...form, quy_cach: v })} />
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400 ml-1">Ghi chú</label>
          <textarea
            value={form.ghi_chu}
            onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
            rows={2}
            className={C.textareaCompact}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Trạng thái kiểm kê</label>
            <select
              value={form.trang_thai}
              onChange={(e) => setForm({ ...form, trang_thai: e.target.value })}
              className={C.controlInput}
            >
              <option value="ACTIVE">Hoạt động trong kho</option>
              <option value="INVENTORY">Đang kiểm kê</option>
              <option value="MAINTENANCE">Bảo trì</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 ml-1">Ngày kiểm kê gần nhất</label>
            <input
              type="datetime-local"
              value={form.ngay_kiem_ke_gan_nhat}
              onChange={(e) => setForm({ ...form, ngay_kiem_ke_gan_nhat: e.target.value })}
              className={C.controlInput}
            />
          </div>
        </div>

        <MdmFormActiveToggleRow active={form.is_active} onChange={(next) => setForm({ ...form, is_active: next })} />

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${C.btnPrimaryBlock} disabled:opacity-60 touch-manipulation`}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />} Lưu
        </button>
      </form>
    </div>
  );
}
