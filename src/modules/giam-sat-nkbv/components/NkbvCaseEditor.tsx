"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";

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
    ngay_ra_vien: "",
    ket_cuc_dieu_tri: "",
    ly_do_tu_vong: "",
    tu_vong_lien_quan_nkbv: false,
  });

  const todayStr = new Date().toISOString().slice(0, 10);

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
        ngay_ra_vien: toDate(row.ngay_ra_vien),
        ket_cuc_dieu_tri: String(row.ket_cuc_dieu_tri || ""),
        ly_do_tu_vong: String(row.ly_do_tu_vong || ""),
        tu_vong_lien_quan_nkbv: Boolean(row.tu_vong_lien_quan_nkbv),
      });
    } else {
      setForm((prev) => ({
        ...prev,
        ma_ca: maTuDong || prev.ma_ca,
        trang_thai_id: defaultTrangThaiId,
        loai_nkbv_id: loaiRows[0]?.id || prev.loai_nkbv_id,
        ma_benh_an: "",
        ma_benh_pham: "",
        loai_benh_pham: "",
        so_luong: "",
        ngay_ra_vien: "",
        ket_cuc_dieu_tri: "",
        ly_do_tu_vong: "",
        tu_vong_lien_quan_nkbv: false,
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
      toast.error(`Sai logic: Ngày sinh [${form.ngay_sinh}] không thể ở tương lai!`);
      return;
    }
    if (form.ngay_vao_vien) {
      if (form.ngay_vao_vien > todayStr) {
        toast.error(`Sai logic: Ngày vào viện [${form.ngay_vao_vien}] không thể ở tương lai!`);
        return;
      }
      if (form.ngay_sinh && form.ngay_vao_vien < form.ngay_sinh) {
        toast.error(`Sai logic: Ngày vào viện [${form.ngay_vao_vien}] không thể trước Ngày sinh [${form.ngay_sinh}]!`);
        return;
      }
    }
    if (form.ngay_phat_hien) {
      if (form.ngay_phat_hien > todayStr) {
        toast.error(`Sai logic: Ngày phát hiện [${form.ngay_phat_hien}] không thể ở tương lai!`);
        return;
      }
      if (form.ngay_vao_vien && form.ngay_phat_hien < form.ngay_vao_vien) {
        toast.error(`Sai logic: Ngày phát hiện [${form.ngay_phat_hien}] không thể trước Ngày vào viện [${form.ngay_vao_vien}]!`);
        return;
      }
      if (form.ngay_sinh && form.ngay_phat_hien < form.ngay_sinh) {
        toast.error(`Sai logic: Ngày phát hiện [${form.ngay_phat_hien}] không thể trước Ngày sinh [${form.ngay_sinh}]!`);
        return;
      }
    }
    if (form.ngay_ra_vien) {
      if (form.ngay_ra_vien > todayStr) {
        toast.error(`Sai logic: Ngày ra viện [${form.ngay_ra_vien}] không thể ở tương lai!`);
        return;
      }
      if (form.ngay_vao_vien && form.ngay_ra_vien < form.ngay_vao_vien) {
        toast.error(`Sai logic: Ngày ra viện [${form.ngay_ra_vien}] không thể trước Ngày vào viện [${form.ngay_vao_vien}]!`);
        return;
      }
    }

    onSubmit({ ...form });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-3xl rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-50"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-6 text-lg font-black uppercase tracking-tight text-[#026f17]">
          {row?.id ? "Sửa phiếu NKBV" : (row?.ma_benh_an !== undefined ? "Đăng ký Đợt Bệnh án / Hồ sơ dịch tễ" : "Ghi nhận ca NKBV / HAI")}
        </h2>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Mã phiếu</label>
              <input
                value={form.ma_ca}
                disabled={Boolean(row?.id)}
                onChange={(e) => setForm({ ...form, ma_ca: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Khoa ghi nhận</label>
              <select
                value={form.khoa_ghi_nhan_id}
                onChange={(e) => setForm({ ...form, khoa_ghi_nhan_id: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="">— Chọn —</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten_danh_muc}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Mã Bệnh nhân (PID)</label>
              <input
                value={form.ma_benh_nhan}
                onChange={(e) => setForm({ ...form, ma_benh_nhan: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: PID-1038888"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-red-700">Mã Bệnh án (Số HS) *</label>
              <input
                value={form.ma_benh_an}
                onChange={(e) => setForm({ ...form, ma_benh_an: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: BA-2026-99"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Mã Bệnh phẩm (Barcode LIS)</label>
              <input
                value={form.ma_benh_pham}
                onChange={(e) => setForm({ ...form, ma_benh_pham: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-mono font-bold"
                placeholder="VD: NT-01"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-red-700">Họ tên BN *</label>
            <input
              value={form.ho_ten_benh_nhan}
              onChange={(e) => setForm({ ...form, ho_ten_benh_nhan: e.target.value })}
              className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Ngày sinh</label>
              <input
                type="date"
                value={form.ngay_sinh}
                max={todayStr}
                onChange={(e) => setForm({ ...form, ngay_sinh: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Giới tính</label>
              <select
                value={form.gioi_tinh}
                onChange={(e) => setForm({ ...form, gioi_tinh: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="">—</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Ngày vào viện</label>
              <input
                type="date"
                value={form.ngay_vao_vien}
                min={form.ngay_sinh || undefined}
                max={todayStr}
                onChange={(e) => setForm({ ...form, ngay_vao_vien: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Ngày phát hiện *</label>
              <input
                type="date"
                value={form.ngay_phat_hien}
                min={form.ngay_vao_vien || form.ngay_sinh || undefined}
                max={todayStr}
                onChange={(e) => setForm({ ...form, ngay_phat_hien: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Loại NKBV *</label>
              <select
                value={form.loai_nkbv_id}
                onChange={(e) => setForm({ ...form, loai_nkbv_id: e.target.value })}
                className="w-full rounded-2xl border-0 bg-[#026f17]/5 px-4 py-3 text-sm font-semibold text-[#026f17]"
              >
                {loaiRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ten}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Trạng thái phiếu *</label>
              <select
                value={form.trang_thai_id}
                onChange={(e) => setForm({ ...form, trang_thai_id: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
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
              <label className="mb-1 block text-[10px] font-bold uppercase text-red-600">Lý do loại trừ *</label>
              <textarea
                value={form.ly_do_loai_tru}
                onChange={(e) => setForm({ ...form, ly_do_loai_tru: e.target.value })}
                rows={2}
                className="w-full rounded-2xl border-0 bg-red-50/40 px-4 py-3 text-sm"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Vị trí / thiết bị liên quan</label>
            <input
              value={form.vi_tri_nhiem_khuan}
              onChange={(e) => setForm({ ...form, vi_tri_nhiem_khuan: e.target.value })}
              className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm"
              placeholder="VD: ICU giường 12, catheter trung tâm…"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Loại bệnh phẩm</label>
              <input
                value={form.loai_benh_pham}
                onChange={(e) => setForm({ ...form, loai_benh_pham: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: Urine (Nước tiểu)"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Tác nhân gây bệnh</label>
              <input
                value={form.tac_nhan_vi_khuan}
                onChange={(e) => setForm({ ...form, tac_nhan_vi_khuan: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: Pseudomonas aeruginosa"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Số lượng (CFU/ml)</label>
              <input
                value={form.so_luong}
                onChange={(e) => setForm({ ...form, so_luong: e.target.value })}
                className="w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold"
                placeholder="VD: 10^5 CFU/ml"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Diễn biến / tóm tắt</label>
            <textarea
              value={form.tom_tat_dien_bien}
              onChange={(e) => setForm({ ...form, tom_tat_dien_bien: e.target.value })}
              rows={3}
              className="w-full rounded-3xl border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Biện pháp phòng ngừa</label>
            <textarea
              value={form.bien_phap_phong_ngua}
              onChange={(e) => setForm({ ...form, bien_phap_phong_ngua: e.target.value })}
              rows={2}
              className="w-full rounded-3xl border-0 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>

          <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/50 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
              🏥 Kết cục Đợt điều trị & Ra viện (Stay Outcomes)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Ngày ra viện (nếu có)</label>
                <input
                  type="date"
                  value={form.ngay_ra_vien}
                  min={form.ngay_vao_vien || undefined}
                  max={todayStr}
                  onChange={(e) => setForm({ ...form, ngay_ra_vien: e.target.value })}
                  className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Kết cục điều trị</label>
                <select
                  value={form.ket_cuc_dieu_tri}
                  onChange={(e) => setForm({ ...form, ket_cuc_dieu_tri: e.target.value })}
                  className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold"
                >
                  <option value="">— Chưa xác định —</option>
                  <option value="KHOI_DO">Khỏi / Đỡ</option>
                  <option value="NANG_XIN_VE">Nặng xin về</option>
                  <option value="TU_VONG">Tử vong</option>
                  <option value="CHUYEN_VIEN">Chuyển viện</option>
                </select>
              </div>
            </div>
            {form.ket_cuc_dieu_tri === "TU_VONG" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-3 bg-red-50/30 rounded-2xl border border-red-100 animate-in fade-in duration-300">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-red-700">Nguyên nhân tử vong</label>
                  <input
                    value={form.ly_do_tu_vong}
                    onChange={(e) => setForm({ ...form, ly_do_tu_vong: e.target.value })}
                    className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm"
                    placeholder="Nhập nguyên nhân tử vong..."
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.tu_vong_lien_quan_nkbv}
                      onChange={(e) => setForm({ ...form, tu_vong_lien_quan_nkbv: e.target.checked })}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-red-800">Tử vong có liên quan đến NKBV</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-550 hover:bg-slate-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-[#026f17] px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-[#026f17]/25"
          >
            Lưu phiếu
          </button>
        </div>
      </div>
    </div>
  );
}
