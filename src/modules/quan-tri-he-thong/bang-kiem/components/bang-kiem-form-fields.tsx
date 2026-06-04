// Các trường nhập khớp cột gstt_dm_bang_kiem trong database.
"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { MdmFormActiveToggleRow } from "@/components/shared/MdmActiveToggle";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";

export interface BangKiemFormState {
  id: string | null;
  ma_bk: string;
  ten_bang_kiem: string;
  mo_ta: string;
  phan_loai_chuyen_mon: string;
  loai_hinh_giam_sat: string;
  is_active: boolean;
  is_system: boolean;
}

interface Props {
  formData: BangKiemFormState;
  setFormData: React.Dispatch<React.SetStateAction<BangKiemFormState>>;
  maTuDong?: string;
  isEditing: boolean;
  /** Theo hub `HINH_THUC_GIAM_SAT` — cột `loai_hinh_giam_sat` lưu `ma_hinh_thuc`. */
  hinhThucRows: RegistrySelectRow[];
  hinhThucLoading?: boolean;
}

/** Nhóm chuyên đề seed mẫu (có thể nhập tay khác). */
const NHOM_GOI_Y = ["VST", "PHONG_NGUA_CHUAN", "CAN_THIEP", "MOI_TRUONG"];

export default function BangKiemFormFields({
  formData,
  setFormData,
  maTuDong,
  isEditing,
  hinhThucRows,
  hinhThucLoading,
}: Props) {
  const codes = new Set(hinhThucRows.map((r) => r.ma));
  const cur = formData.loai_hinh_giam_sat;
  const orphan = Boolean(cur && !codes.has(cur));

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã bảng kiểm</label>
        <div className="relative">
          <input
            value={formData.ma_bk}
            onChange={(e) => setFormData((p) => ({ ...p, ma_bk: e.target.value }))}
            disabled={formData.is_system || isEditing}
            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none transition-all pr-12 disabled:opacity-60"
            placeholder="VD: BK001"
          />
          {!isEditing && maTuDong && (
            <button
              type="button"
              title="áp dụng mã gợi ý"
              onClick={() => setFormData((p) => ({ ...p, ma_bk: maTuDong }))}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#026f17] hover:scale-110 transition-transform"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên bảng kiểm</label>
        <input
          value={formData.ten_bang_kiem}
          onChange={(e) => setFormData((p) => ({ ...p, ten_bang_kiem: e.target.value }))}
          disabled={formData.is_system}
          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none disabled:opacity-60"
          placeholder="Nhập tên bảng kiểm..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phân loại chuyên môn KSNK</label>
        <select
          value={formData.phan_loai_chuyen_mon || "PHONG_NGUA_CHUAN"}
          onChange={(e) => setFormData((p) => ({ ...p, phan_loai_chuyen_mon: e.target.value }))}
          disabled={formData.is_system}
          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none disabled:opacity-60"
        >
          <option value="PHONG_NGUA_CHUAN">Phòng ngừa chuẩn</option>
          <option value="GOI_CAN_THIEP">Gói can thiệp</option>
          <option value="XU_LY_DUNG_CU">Xử lý dụng cụ</option>
          <option value="MOI_TRUONG_CHAT_THAI">Môi trường & Chất thải</option>
          <option value="CHUYEN_KHOA">Chuyên khoa</option>
          <option value="QUAN_TRI_HE_THONG">Quản trị hệ thống</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả</label>
        <textarea
          value={formData.mo_ta}
          onChange={(e) => setFormData((p) => ({ ...p, mo_ta: e.target.value }))}
          rows={3}
          disabled={formData.is_system}
          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none resize-none disabled:opacity-60"
          placeholder="Mô tả mục đích bảng kiểm..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Loại hình giám sát (danh mục Hình thức giám sát)
        </label>
        <select
          value={cur}
          onChange={(e) => setFormData((p) => ({ ...p, loai_hinh_giam_sat: e.target.value }))}
          disabled={formData.is_system || hinhThucLoading}
          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#026f17]/20 outline-none appearance-none disabled:opacity-60"
        >
          {hinhThucLoading ? (
            <option value={cur}>Đang tải danh mục…</option>
          ) : null}
          {!hinhThucLoading && hinhThucRows.length === 0 ? (
            <option value={cur || "TRUC_TIEP"}>Chưa có dữ liệu hub — giữ mã: {cur || "TRUC_TIEP"}</option>
          ) : null}
          {orphan ? <option value={cur}>Giữ mã hiện tại: {cur}</option> : null}
          {hinhThucRows.map((r) => (
            <option key={r.id} value={r.ma}>
              {r.ten}
            </option>
          ))}
        </select>
      </div>

      <MdmFormActiveToggleRow
        active={formData.is_active}
        onChange={(next) => setFormData((p) => ({ ...p, is_active: next }))}
        disabled={formData.is_system}
        footnote={formData.is_system ? "Bảng kiểm hệ thống: chỉ xem trạng thái tại đây; chỉnh Tắt/Bật theo phân quyền ở bảng danh sách." : undefined}
      />

      {formData.is_system && (
        <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">
          Bảng kiểm hệ thống: không sửa mã, tên và tiêu chí cốt lõi ở đây để tránh gãy dữ liệu tham chiếu. Có thể tắt bật khác qua chức năng trạng thái trong bảng nếu được phép.
        </p>
      )}
    </div>
  );
}
