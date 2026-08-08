"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { updateNkbvBenhAnStay } from "../actions/giam-sat-nkbv.actions";
import { formatDateVi } from "@/lib/format-datetime-vi";

type KhoaOpt = { id: string; ma_danh_muc?: string; ten_danh_muc?: string };

export type NkbvBenhAnStayRow = {
  ma_benh_an: string;
  ma_benh_nhan?: string | null;
  ho_ten_benh_nhan?: string | null;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  ngay_vao_vien?: string | null;
  ngay_ra_vien?: string | null;
  khoa_dieu_tri_id?: string | null;
  ket_cuc_dieu_tri?: string | null;
  ly_do_tu_vong?: string | null;
  tu_vong_lien_quan_nkbv?: boolean | null;
};

type Props = {
  stay: NkbvBenhAnStayRow;
  khoas: KhoaOpt[];
  onClose: () => void;
  onSaved: () => void;
};

const toDate = (v: unknown) => (v ? String(v).slice(0, 10) : "");

export default function NkbvBenhAnEditModal({ stay, khoas, onClose, onSaved }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ma_benh_nhan: "",
    ho_ten_benh_nhan: "",
    ngay_sinh: "",
    gioi_tinh: "",
    ngay_vao_vien: "",
    ngay_ra_vien: "",
    khoa_dieu_tri_id: "",
    ket_cuc_dieu_tri: "",
    ly_do_tu_vong: "",
    tu_vong_lien_quan_nkbv: false,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setForm({
      ma_benh_nhan: String(stay.ma_benh_nhan || ""),
      ho_ten_benh_nhan: String(stay.ho_ten_benh_nhan || ""),
      ngay_sinh: toDate(stay.ngay_sinh),
      gioi_tinh: String(stay.gioi_tinh || ""),
      ngay_vao_vien: toDate(stay.ngay_vao_vien),
      ngay_ra_vien: toDate(stay.ngay_ra_vien),
      khoa_dieu_tri_id: String(stay.khoa_dieu_tri_id || ""),
      ket_cuc_dieu_tri: String(stay.ket_cuc_dieu_tri || ""),
      ly_do_tu_vong: String(stay.ly_do_tu_vong || ""),
      tu_vong_lien_quan_nkbv: Boolean(stay.tu_vong_lien_quan_nkbv),
    });
  }, [stay]);

  const onSave = async () => {
    if (!form.ho_ten_benh_nhan.trim()) {
      toast.error("Họ tên không được để trống");
      return;
    }
    if (!form.ma_benh_nhan.trim()) {
      toast.error("Mã bệnh nhân không được để trống");
      return;
    }
    if (form.ngay_ra_vien && form.ngay_vao_vien && form.ngay_ra_vien < form.ngay_vao_vien) {
      toast.error(
        `Ngày ra viện [${formatDateVi(form.ngay_ra_vien)}] không được trước ngày vào viện`,
      );
      return;
    }
    setSaving(true);
    const res = await updateNkbvBenhAnStay({
      ma_benh_an: stay.ma_benh_an,
      ma_benh_nhan: form.ma_benh_nhan,
      ho_ten_benh_nhan: form.ho_ten_benh_nhan,
      ngay_sinh: form.ngay_sinh || null,
      gioi_tinh: form.gioi_tinh || null,
      ngay_vao_vien: form.ngay_vao_vien || null,
      ngay_ra_vien: form.ngay_ra_vien || null,
      khoa_dieu_tri_id: form.khoa_dieu_tri_id || null,
      ket_cuc_dieu_tri: form.ket_cuc_dieu_tri || null,
      ly_do_tu_vong: form.ket_cuc_dieu_tri === "TU_VONG" ? form.ly_do_tu_vong || null : null,
      tu_vong_lien_quan_nkbv:
        form.ket_cuc_dieu_tri === "TU_VONG" ? form.tu_vong_lien_quan_nkbv : false,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Không lưu được hồ sơ bệnh án");
      return;
    }
    toast.success("Đã cập nhật hồ sơ đợt nằm viện");
    onSaved();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10055] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative my-4 w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-50"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className={C.modalTitle}>Sửa hồ sơ đợt nằm viện</h2>
        <p className="mt-1 text-xs text-slate-500">
          Mã BA <span className="font-mono font-semibold text-slate-800">{stay.ma_benh_an}</span> — không
          phải phiếu xác định ca NKBV.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={C.formLabel}>Mã bệnh nhân</label>
            <input
              value={form.ma_benh_nhan}
              onChange={(e) => setForm({ ...form, ma_benh_nhan: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className={C.formLabel}>Họ và tên</label>
            <input
              value={form.ho_ten_benh_nhan}
              onChange={(e) => setForm({ ...form, ho_ten_benh_nhan: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
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
              max={todayStr}
              onChange={(e) => setForm({ ...form, ngay_vao_vien: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className={C.formLabel}>Ngày ra viện</label>
            <input
              type="date"
              value={form.ngay_ra_vien}
              min={form.ngay_vao_vien || undefined}
              max={todayStr}
              onChange={(e) => setForm({ ...form, ngay_ra_vien: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className={C.formLabel}>Khoa điều trị</label>
            <SearchableSelect
              value={form.khoa_dieu_tri_id}
              onChange={(v) => setForm({ ...form, khoa_dieu_tri_id: String(v || "") })}
              options={[
                { id: "", label: "— Chưa chọn —" },
                ...khoas.map((k) => ({
                  id: k.id,
                  label: formatKhoaPickerLabel({
                    ma_danh_muc: k.ma_danh_muc,
                    ten_danh_muc: k.ten_danh_muc,
                  }),
                })),
              ]}
              placeholder="Chọn khoa…"
            />
          </div>
          <div>
            <label className={C.formLabel}>Kết cục điều trị</label>
            <select
              value={form.ket_cuc_dieu_tri}
              onChange={(e) => setForm({ ...form, ket_cuc_dieu_tri: e.target.value })}
              className="w-full rounded-[var(--radius-shell)] border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
            >
              <option value="">— Chưa xác định —</option>
              <option value="KHOI_DO">Khỏi / Đỡ</option>
              <option value="NANG_XIN_VE">Nặng xin về</option>
              <option value="TU_VONG">Tử vong</option>
              <option value="CHUYEN_VIEN">Chuyển viện</option>
            </select>
          </div>
          {form.ket_cuc_dieu_tri === "TU_VONG" ? (
            <div className="space-y-3 rounded-[var(--radius-shell)] border border-red-100 bg-red-50/40 p-3 md:col-span-1">
              <div>
                <label className={`${C.formLabel} text-red-700`}>Nguyên nhân tử vong</label>
                <input
                  value={form.ly_do_tu_vong}
                  onChange={(e) => setForm({ ...form, ly_do_tu_vong: e.target.value })}
                  className="w-full rounded-[var(--radius-shell)] border-0 bg-white px-4 py-3 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-red-800">
                <input
                  type="checkbox"
                  checked={form.tu_vong_lien_quan_nkbv}
                  onChange={(e) => setForm({ ...form, tu_vong_lien_quan_nkbv: e.target.checked })}
                />
                Tử vong liên quan NKBV
              </label>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={`${C.ctaSecondary} min-h-11`}>
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className={`${C.ctaPrimary} min-h-11 disabled:opacity-50`}
          >
            {saving ? "Đang lưu…" : "Lưu hồ sơ BA"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
