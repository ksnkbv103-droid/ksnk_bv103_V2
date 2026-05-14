"use client";

import React, { useState, useEffect } from "react";
import { getNhanSuFormOptionsAction, suggestNextMaNhanSuMaAction } from "../actions/nhan-su-read.actions";
import { NHAN_SU_DEFAULT_MA_NV_PREFIX } from "../lib/nhan-su-ma-prefix";
import { saveNhanSuAction } from "../actions/nhan-su-write.actions";
import type { NhanSu } from "../types";
import { toast } from "sonner";
import NhanSuFormFields from "./form/NhanSuFormFields";
import { useGenerateMa } from "@/hooks/useGenerateMa";

interface Props {
  initialData?: Partial<NhanSu> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function NhanSuForm({ initialData, onSuccess, onCancel }: Props) {
  const { maTuDong } = useGenerateMa(NHAN_SU_DEFAULT_MA_NV_PREFIX, undefined, () =>
    suggestNextMaNhanSuMaAction(NHAN_SU_DEFAULT_MA_NV_PREFIX),
  );
  const [loading, setLoading] = useState(false);
  const [khoas, setKhoas] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [chucDanhs, setChucDanhs] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [tos, setTos] = useState<{ id: string; ten_danh_muc: string; extra_data?: Record<string, unknown> | null }[]>([]);
  const [vaiTros, setVaiTros] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [chucVus, setChucVus] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  const [ngheNghieps, setNgheNghieps] = useState<{ id: string; ten_danh_muc: string }[]>([]);
  
  const defaults: Partial<NhanSu> = {
    ma_nv: "",
    ho_ten: "",
    khoa_id: "",
    to_id: "",
    chuc_vu: "",
    chuc_vu_id: "",
    chuc_danh_id: "",
    chuc_danh: "",
    vai_tro_he_thong_id: "",
    vai_tro_he_thong_ksnk: "",
    nghe_nghiep_id: "",
    ngay_sinh: null,
    gioi_tinh: null,
    so_dien_thoai: "",
    email: "",
    is_active: true,
    extra_data: {},
  };

  const [formData, setFormData] = useState<Partial<NhanSu>>(() =>
    initialData ? { ...defaults, ...initialData, is_active: initialData.is_active ?? true } : defaults
  );

  useEffect(() => {
    async function loadCategories() {
      const res = await getNhanSuFormOptionsAction();
      if (!res.success) {
        toast.error(res.error || "Không tải được danh mục nhân sự.");
        return;
      }
      const norm = <T extends { id?: string; ten_danh_muc?: string }>(rows: T[]) =>
        rows
          .filter((r): r is T & { id: string } => Boolean(r.id))
          .map((r) => ({ id: r.id, ten_danh_muc: String(r.ten_danh_muc ?? "") }));
      setKhoas(norm(res.data.khoas || []));
      setChucDanhs(norm(res.data.chucDanhs || []));
      setTos(
        (res.data.tos || [])
          .filter((r: { id?: string; ten_danh_muc?: string; extra_data?: any }): r is { id: string; ten_danh_muc?: string; extra_data?: any } => Boolean(r.id))
          .map((r: { id: string; ten_danh_muc?: string; extra_data?: any }) => {
            const ex = r as { extra_data?: Record<string, unknown> | null };
            return {
              id: r.id,
              ten_danh_muc: String(r.ten_danh_muc ?? ""),
              extra_data: ex.extra_data ?? null,
            };
          }),
      );
      setChucVus(norm(res.data.chucVus || []));
      setVaiTros(norm(res.data.vaiTros || []));
      setNgheNghieps(norm(res.data.ngheNghieps || []));
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!initialData?.id && maTuDong && !formData.ma_nv) {
      setFormData(prev => ({ ...prev, ma_nv: maTuDong }));
    }
  }, [maTuDong, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ma_nv || !formData.ho_ten) {
      toast.error("Vui lòng nhập đầy đủ Mã NV và Họ tên");
      return;
    }

    setLoading(true);

    // Clean data: Chuyển "" thành null để tránh lỗi UUID invalid input syntax
    const cleaned: Record<string, unknown> = { ...formData };
    // Không gửi các field join/hiển thị về DB để tránh lỗi schema cache.
    delete cleaned.khoa;
    delete cleaned.to;
    delete cleaned.nghe_nghiep;
    delete cleaned.ten_khoa;
    delete cleaned.ten_to;
    delete cleaned.ten_chuc_danh;
    delete cleaned.ten_chuc_vu;
    delete cleaned.ten_vai_tro;
    delete cleaned.ten_nghe_nghiep;
    delete cleaned.ten_nghe_nghiep_dm;
    
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === "") cleaned[key] = null;
    }
    const res = await saveNhanSuAction(cleaned as Partial<NhanSu>);
    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      onSuccess();
    } else {
      toast.error(res.error || "Có lỗi xảy ra khi lưu dữ liệu");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl premium-card animate-in zoom-in-95 duration-300">
        <div className="bg-[#026f17] p-8 text-white">
          <h3 className="text-2xl font-black uppercase tracking-tight">
            {initialData?.id ? "Cập nhật Hồ sơ Nhân sự" : "Thêm Nhân sự mới"}
          </h3>
          <p className="text-white/70 text-sm mt-1 font-medium italic">GHI CHÚ: Mã nhân viên là định danh duy nhất của từng cá nhân</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <NhanSuFormFields
            formData={formData}
            setFormData={setFormData}
            loading={loading}
            khoas={khoas}
            chucDanhs={chucDanhs}
            chucVus={chucVus}
            tos={tos}
            vaiTros={vaiTros}
            ngheNghieps={ngheNghieps}
            maTuDong={maTuDong}
            isNew={!initialData?.id}
          />

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel}
              className="flex-1 h-12 rounded-full border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 transition-all"
              disabled={loading}>Hủy bỏ</button>
            <button type="submit"
              className="flex-[2] h-12 rounded-full bg-[#026f17] text-white font-black uppercase tracking-widest shadow-lg hover:shadow-[#026f17]/20 hover:translate-y-[-2px] transition-all disabled:opacity-50"
              disabled={loading}>{loading ? "Đang xử lý..." : "Lưu hồ sơ"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
