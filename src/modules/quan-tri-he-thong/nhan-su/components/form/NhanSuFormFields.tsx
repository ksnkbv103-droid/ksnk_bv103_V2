// src/modules/quan-tri-he-thong/nhan-su/components/form/NhanSuFormFields.tsx
"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import type { NhanSu } from "@/modules/quan-tri-he-thong/nhan-su/types";
import NhanSuFormFieldsOrg from "./NhanSuFormFieldsOrg";
import SearchableSelect from "@/components/shared/SearchableSelect";

interface NhanSuFormFieldsProps {
  formData: Partial<NhanSu> & Record<string, unknown>;
  setFormData: (data: Partial<NhanSu> & Record<string, unknown>) => void;
  loading: boolean;
  khoas: { id: string; ten_danh_muc: string }[];
  chucDanhs: { id: string; ten_danh_muc: string }[];
  chucVus: { id: string; ten_danh_muc: string }[];
  tos: { id: string; ten_danh_muc: string; extra_data?: Record<string, unknown> | null }[];
  vaiTros: { id: string; ten_danh_muc: string }[];
  ngheNghieps: { id: string; ten_danh_muc: string }[];
  maTuDong?: string;
  isNew?: boolean;
}

export default function NhanSuFormFields({
  formData,
  setFormData,
  loading,
  khoas,
  chucDanhs,
  chucVus,
  tos,
  vaiTros,
  ngheNghieps,
  maTuDong,
  isNew,
}: NhanSuFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Mã Nhân viên (Tự động gợi ý)</label>
        <div className="relative">
          <input className="input w-full bg-slate-50 border-slate-100 focus:bg-white font-bold pr-12" placeholder="VD: NV001"
            value={formData.ma_nv ?? ""} onChange={(e) => setFormData({ ...formData, ma_nv: e.target.value })} disabled={loading} required />
          {isNew && maTuDong && (
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, ma_nv: maTuDong })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#026f17] hover:scale-110 transition-transform"
              title="Sử dụng mã gợi ý"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Họ và tên</label>
        <input className="input w-full bg-slate-50 border-slate-100 focus:bg-white font-bold" placeholder="VD: Nguyễn Văn A"
          value={formData.ho_ten ?? ""} onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })} disabled={loading} required />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Khoa / Phòng</label>
        <SearchableSelect
          value={formData.khoa_id ?? ""}
          onChange={(val) => setFormData({ ...formData, khoa_id: val })}
          options={khoas.map((k) => ({ id: k.id, label: k.ten_danh_muc }))}
          placeholder="-- Chọn Khoa / Phòng --"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Chức danh</label>
        <SearchableSelect
          value={formData.chuc_danh_id ?? ""}
          onChange={(id) => {
            const row = chucDanhs.find((c) => c.id === id);
            setFormData({
              ...formData,
              chuc_danh_id: id,
              chuc_danh: row?.ten_danh_muc ?? "",
            });
          }}
          options={chucDanhs.map((cd) => ({ id: cd.id, label: cd.ten_danh_muc }))}
          placeholder="-- Chọn chức danh --"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Nghề nghiệp</label>
        <SearchableSelect
          value={formData.nghe_nghiep_id ?? ""}
          onChange={(val) => setFormData({ ...formData, nghe_nghiep_id: val })}
          options={ngheNghieps.map((nn) => ({ id: nn.id, label: nn.ten_danh_muc }))}
          placeholder="-- Chọn Nghề nghiệp --"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Số điện thoại</label>
        <input className="input w-full bg-slate-50 border-slate-100 focus:bg-white" placeholder="09xx..."
          value={formData.so_dien_thoai ?? ""} onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })} disabled={loading} />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Email</label>
        <input className="input w-full bg-slate-50 border-slate-100 focus:bg-white" placeholder="email@hospital.com"
          value={formData.email ?? ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={loading} />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Ngày sinh</label>
        <input
          type="date"
          className="input w-full bg-slate-50 border-slate-100 focus:bg-white font-bold"
          value={formData.ngay_sinh ? String(formData.ngay_sinh).slice(0, 10) : ""}
          onChange={(e) => setFormData({ ...formData, ngay_sinh: e.target.value || null })}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#026f17] uppercase tracking-[0.2em] ml-4">Giới tính</label>
        <select
          className="select w-full bg-slate-50 border-slate-100 font-bold"
          value={typeof formData.gioi_tinh === "string" ? formData.gioi_tinh : ""}
          onChange={(e) => setFormData({ ...formData, gioi_tinh: e.target.value || null })}
          disabled={loading}
        >
          <option value="">-- Chọn --</option>
          <option value="NAM">Nam</option>
          <option value="NU">Nữ</option>
          <option value="KHAC">Khác</option>
        </select>
      </div>

      <NhanSuFormFieldsOrg
        formData={formData as Record<string, unknown>}
        setFormData={setFormData as (data: Record<string, unknown>) => void}
        loading={loading}
        tos={tos}
        vaiTros={vaiTros}
        chucVus={chucVus}
      />
    </div>
  );
}
