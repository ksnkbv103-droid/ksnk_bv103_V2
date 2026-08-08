"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import EntityQrBlock from "@/components/shared/EntityQrBlock";
import { buildEntityQrCode } from "@/lib/entity-qr/entity-qr-core";
import { useEntityQrImage } from "@/hooks/useEntityQr";
import { formatDateVi } from "@/lib/format-datetime-vi";

export type NkbvCaseLike = Record<string, unknown> & {
  id?: string;
  ma_ca?: string;
};

type NkbvCaseEditorProps = {
  row: NkbvCaseLike | null;
  onClose: () => void;
  khoas: MasterOption[];
  loaiRows: RegistrySelectRow[];
  trangThaiRows: RegistrySelectRow[];
  defaultTrangThaiId: string;
  maTuDong: string;
  onSubmit: (payload: Record<string, unknown>) => void;
};

const toDate = (v: unknown) => (v ? String(v).slice(0, 10) : "");

export default function NkbvCaseEditor({
  row,
  onClose,
  khoas,
  loaiRows,
  trangThaiRows,
  defaultTrangThaiId,
  maTuDong,
  onSubmit,
}: NkbvCaseEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    ma_ca: "",
    khoa_ghi_nhan_id: "",
    ma_benh_nhan: "",
    ho_ten_benh_nhan: "",
    ngay_sinh: "",
    gioi_tinh: "",
    ngay_vao_vien: "",
    ngay_phat_hien: new Date().toISOString().slice(0, 10),
    vi_tri_nhiem_khuan: "",
    tac_nhan_vi_khuan: "",
    tom_tat_dien_bien: "",
    bien_phap_phong_ngua: "",
    loai_nkbv_id: loaiRows[0]?.id || "",
    trang_thai_id: defaultTrangThaiId,
    ly_do_loai_tru: "",
    nguoi_ghi_id: "",
    ma_benh_an: "",
    ma_benh_pham: "",
    loai_benh_pham: "",
    so_luong: "",
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (row?.id) {
      setForm({
        ma_ca: String(row.ma_ca || ""),
        khoa_ghi_nhan_id: String(row.khoa_ghi_nhan_id || ""),
        ma_benh_nhan: String(row.ma_benh_nhan || ""),
        ho_ten_benh_nhan: String(row.ho_ten_benh_nhan || ""),
        ngay_sinh: toDate(row.ngay_sinh),
        gioi_tinh: String(row.gioi_tinh || ""),
        ngay_vao_vien: toDate(row.ngay_vao_vien),
        ngay_phat_hien: toDate(row.ngay_phat_hien) || new Date().toISOString().slice(0, 10),
        vi_tri_nhiem_khuan: String(row.vi_tri_nhiem_khuan || ""),
        tac_nhan_vi_khuan: String(row.tac_nhan_vi_khuan || ""),
        tom_tat_dien_bien: String(row.tom_tat_dien_bien || ""),
        bien_phap_phong_ngua: String(row.bien_phap_phong_ngua || ""),
        loai_nkbv_id: String(row.loai_nkbv_id || loaiRows[0]?.id || ""),
        trang_thai_id: String(row.trang_thai_id || defaultTrangThaiId),
        ly_do_loai_tru: String(row.ly_do_loai_tru || ""),
        nguoi_ghi_id: String(row.nguoi_ghi_id || ""),
        ma_benh_an: String(row.ma_benh_an || ""),
        ma_benh_pham: String(row.ma_benh_pham || ""),
        loai_benh_pham: String((row as any).loai_benh_pham || ""),
        so_luong: String((row as any).so_luong || ""),
      });
    } else {
      setForm((prev) => ({
        ...prev,
        ma_ca: maTuDong || prev.ma_ca,
        trang_thai_id: defaultTrangThaiId,
        loai_nkbv_id: loaiRows[0]?.id || prev.loai_nkbv_id,
        khoa_ghi_nhan_id: String(row?.khoa_ghi_nhan_id || prev.khoa_ghi_nhan_id || ""),
        ma_benh_nhan: String(row?.ma_benh_nhan || ""),
        ho_ten_benh_nhan: String(row?.ho_ten_benh_nhan || ""),
        ngay_sinh: toDate(row?.ngay_sinh),
        gioi_tinh: String(row?.gioi_tinh || ""),
        ngay_vao_vien: toDate(row?.ngay_vao_vien),
        ma_benh_an: String(row?.ma_benh_an || ""),
        ma_benh_pham: "",
        loai_benh_pham: "",
        so_luong: "",
      }));
    }
  }, [row, maTuDong, defaultTrangThaiId, loaiRows]);

  const ttMa = trangThaiRows.find((t) => t.id === form.trang_thai_id)?.ma;

  const handleSave = () => {
    if (!form.ho_ten_benh_nhan.trim()) {
      toast.error("Họ tên bệnh nhân không được để trống!");
      return;
    }
    if (!form.loai_nkbv_id) {
      toast.error("Loại NKBV không được để trống!");
      return;
    }
    if (!form.ngay_phat_hien) {
      toast.error("Ngày phát hiện không được để trống!");
      return;
    }

    // Date Logic Validations
    if (form.ngay_sinh && form.ngay_sinh > todayStr) {
      toast.error(`Sai logic: Ngày sinh [${formatDateVi(form.ngay_sinh)}] không thể ở tương lai!`);
      return;
    }
    if (form.ngay_vao_vien) {
      if (form.ngay_vao_vien > todayStr) {
        toast.error(`Sai logic: Ngày vào viện [${formatDateVi(form.ngay_vao_vien)}] không thể ở tương lai!`);
        return;
      }
      if (form.ngay_sinh && form.ngay_vao_vien < form.ngay_sinh) {
        toast.error(`Sai logic: Ngày vào viện [${formatDateVi(form.ngay_vao_vien)}] không thể trước Ngày sinh [${formatDateVi(form.ngay_sinh)}]!`);
        return;
      }
    }
    if (form.ngay_phat_hien) {
      if (form.ngay_phat_hien > todayStr) {
        toast.error(`Sai logic: Ngày phát hiện [${formatDateVi(form.ngay_phat_hien)}] không thể ở tương lai!`);
        return;
      }
      if (form.ngay_vao_vien && form.ngay_phat_hien < form.ngay_vao_vien) {
        toast.error(`Sai logic: Ngày phát hiện [${formatDateVi(form.ngay_phat_hien)}] không thể trước Ngày vào viện [${formatDateVi(form.ngay_vao_vien)}]!`);
        return;
      }
      if (form.ngay_sinh && form.ngay_phat_hien < form.ngay_sinh) {
        toast.error(`Sai logic: Ngày phát hiện [${formatDateVi(form.ngay_phat_hien)}] không thể trước Ngày sinh [${formatDateVi(form.ngay_sinh)}]!`);
        return;
      }
    }
    onSubmit({ ...form });
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-3xl rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-50"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className={`mb-6 ${C.modalTitle}`}>
          {row?.id ? "Sửa phiếu xác định ca NKBV" : "Ghi nhận phiếu xác định ca NKBV / HAI"}
        </h2>
        <p className="mb-4 -mt-4 text-xs text-slate-500">
          Kết cục / ra viện thuộc <strong>hồ sơ đợt nằm viện</strong> — sửa ở tab Hồ sơ Bệnh án (hub BA), không
          lưu trên phiếu này.
        </p>
        {row?.id ? <NkbvCaseQrPanel caseId={String(row.id)} /> : null}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={C.formLabel}>Mã phiếu</label>
              <input
                value={form.ma_ca}
                disabled={Boolean(row?.id)}
                onChange={(e) => setForm({ ...form, ma_ca: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className={C.formLabel}>Khoa ghi nhận</label>
              <select
                value={form.khoa_ghi_nhan_id}
                onChange={(e) => setForm({ ...form, khoa_ghi_nhan_id: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="">— Chọn —</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {formatKhoaPickerLabel({
                      ma_danh_muc: k.ma_danh_muc,
                      ten_danh_muc: k.ten_danh_muc,
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={C.formLabel}>Mã Bệnh nhân (PID)</label>
              <input
                value={form.ma_benh_nhan}
                onChange={(e) => setForm({ ...form, ma_benh_nhan: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: PID-1038888"
              />
            </div>
            <div>
              <label className={` text-red-700`}>Mã Bệnh án (Số HS) *</label>
              <input
                value={form.ma_benh_an}
                onChange={(e) => setForm({ ...form, ma_benh_an: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: BA-2026-99"
              />
            </div>
            <div>
              <label className={C.formLabel}>Mã Bệnh phẩm (Barcode LIS)</label>
              <input
                value={form.ma_benh_pham}
                onChange={(e) => setForm({ ...form, ma_benh_pham: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-mono font-bold"
                placeholder="VD: NT-01"
              />
            </div>
          </div>
          <div>
            <label className={` text-red-700`}>Họ tên BN *</label>
            <input
              value={form.ho_ten_benh_nhan}
              onChange={(e) => setForm({ ...form, ho_ten_benh_nhan: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className={C.formLabel}>Ngày sinh</label>
              <input
                type="date"
                value={form.ngay_sinh}
                max={todayStr}
                onChange={(e) => setForm({ ...form, ngay_sinh: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className={C.formLabel}>Giới tính</label>
              <select
                value={form.gioi_tinh}
                onChange={(e) => setForm({ ...form, gioi_tinh: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="">—</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className={C.formLabel}>Ngày vào viện</label>
              <input
                type="date"
                value={form.ngay_vao_vien}
                min={form.ngay_sinh || undefined}
                max={todayStr}
                onChange={(e) => setForm({ ...form, ngay_vao_vien: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className={C.formLabel}>Ngày phát hiện *</label>
              <input
                type="date"
                value={form.ngay_phat_hien}
                min={form.ngay_vao_vien || form.ngay_sinh || undefined}
                max={todayStr}
                onChange={(e) => setForm({ ...form, ngay_phat_hien: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={C.formLabel}>Loại NKBV *</label>
              <select
                value={form.loai_nkbv_id}
                onChange={(e) => setForm({ ...form, loai_nkbv_id: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-[var(--primary)]/5 px-4 py-3 text-sm font-semibold text-[var(--primary)]"
              >
                {loaiRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ten}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={C.formLabel}>Trạng thái phiếu *</label>
              <select
                value={form.trang_thai_id}
                onChange={(e) => setForm({ ...form, trang_thai_id: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
              >
                {trangThaiRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ten}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {ttMa === "LOAI_TRU" && (
            <div>
              <label className={` text-red-600`}>Lý do loại trừ *</label>
              <textarea
                value={form.ly_do_loai_tru}
                onChange={(e) => setForm({ ...form, ly_do_loai_tru: e.target.value })}
                rows={2}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-red-50/40 px-4 py-3 text-sm"
              />
            </div>
          )}
          <div>
            <label className={C.formLabel}>Vị trí / thiết bị liên quan</label>
            <input
              value={form.vi_tri_nhiem_khuan}
              onChange={(e) => setForm({ ...form, vi_tri_nhiem_khuan: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
              placeholder="VD: ICU giường 12, catheter trung tâm…"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={C.formLabel}>Loại bệnh phẩm</label>
              <input
                value={form.loai_benh_pham}
                onChange={(e) => setForm({ ...form, loai_benh_pham: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: Urine (Nước tiểu)"
              />
            </div>
            <div>
              <label className={C.formLabel}>Tác nhân gây bệnh</label>
              <input
                value={form.tac_nhan_vi_khuan}
                onChange={(e) => setForm({ ...form, tac_nhan_vi_khuan: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: Pseudomonas aeruginosa"
              />
            </div>
            <div>
              <label className={C.formLabel}>Số lượng (CFU/ml)</label>
              <input
                value={form.so_luong}
                onChange={(e) => setForm({ ...form, so_luong: e.target.value })}
                className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: 10^5 CFU/ml"
              />
            </div>
          </div>
          <div>
            <label className={C.formLabel}>Diễn biến / tóm tắt</label>
            <textarea
              value={form.tom_tat_dien_bien}
              onChange={(e) => setForm({ ...form, tom_tat_dien_bien: e.target.value })}
              rows={3}
              className="w-full rounded-[var(--radius-control)] border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className={C.formLabel}>Biện pháp phòng ngừa</label>
            <textarea
              value={form.bien_phap_phong_ngua}
              onChange={(e) => setForm({ ...form, bien_phap_phong_ngua: e.target.value })}
              rows={2}
              className="w-full rounded-[var(--radius-control)] border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>

        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={C.ctaSecondary}>
            Huỷ
          </button>
          <button type="button" onClick={handleSave} className={C.ctaPrimary}>
            Lưu phiếu
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NkbvCaseQrPanel({ caseId }: { caseId: string }) {
  const code = buildEntityQrCode("NKBV_CASE", caseId);
  const dataUrl = useEntityQrImage(code);
  if (!dataUrl) return null;
  return (
    <div className="mb-4 flex justify-end print:hidden">
      <EntityQrBlock dataUrl={dataUrl} code={code} caption="Quét mở lại phiếu NKBV" variant="screen" />
    </div>
  );
}
