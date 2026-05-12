"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { createCongViec, updateCongViec } from "../actions/cong-viec.actions";
import { getNhanSuOptions, getKhoaPhongOptions, getToCongTacOptions } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { congViecSchema } from "@/lib/validations/quan-ly-cong-viec.validations";
import type { CongViecInput } from "../types";

interface Props {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CongViecForm({ initialData, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [nhanSuOptions, setNhanSuOptions] = useState<any[]>([]);
  const [khoaPhongOptions, setKhoaPhongOptions] = useState<any[]>([]);
  const [toCongTacOptions, setToCongTacOptions] = useState<any[]>([]);

  const [selectedNhanSu, setSelectedNhanSu] = useState(initialData?.nguoi_phu_trach_id || "");
  const [selectedKhoa, setSelectedKhoa] = useState(initialData?.khoa_thuc_hien_id || "");
  const [selectedTo, setSelectedTo] = useState(initialData?.to_cong_tac_id || "");
  const [loaiPhamVi, setLoaiPhamVi] = useState(initialData?.loai_pham_vi || "NOI_BO");

  // Đồng bộ state khi dữ liệu ban đầu thay đổi (Quan trọng cho Dialog)
  useEffect(() => {
    setSelectedNhanSu(initialData?.nguoi_phu_trach_id || "");
    setSelectedKhoa(initialData?.khoa_thuc_hien_id || "");
    setSelectedTo(initialData?.to_cong_tac_id || "");
    setLoaiPhamVi(initialData?.loai_pham_vi || "NOI_BO");
  }, [initialData]);

  // Tải dữ liệu danh mục
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [ns, kp, tct] = await Promise.all([
          getNhanSuOptions(),
          getKhoaPhongOptions(),
          getToCongTacOptions()
        ]);
        setNhanSuOptions(ns);
        setKhoaPhongOptions(kp);
        setToCongTacOptions(tct);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      }
    };
    loadOptions();
  }, []);

  // Lọc danh sách nhân sự theo tổ
  const filteredNhanSuOptions = useMemo(() => {
    if (!selectedTo) return nhanSuOptions;
    return nhanSuOptions.filter(opt => opt.to_id === selectedTo);
  }, [nhanSuOptions, selectedTo]);

  // Logic: Nếu chọn tổ mới mà nhân sự cũ không thuộc tổ đó -> Reset nhân sự
  useEffect(() => {
    if (selectedTo && selectedNhanSu) {
      const exists = filteredNhanSuOptions.some(opt => opt.id === selectedNhanSu);
      if (!exists) setSelectedNhanSu("");
    }
  }, [selectedTo, filteredNhanSuOptions, selectedNhanSu]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Chuẩn bị dữ liệu và ép kiểu an toàn
    const rawPayload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: (formData.get("mo_ta") as string) || null,
      loai_pham_vi: (formData.get("loai_pham_vi") as any) || "NOI_BO",
      loai_cong_viec: (formData.get("loai_cong_viec") as any) || "DOT_XUAT",
      muc_do_uu_tien: (formData.get("muc_do_uu_tien") as any) || "TRUNG_BINH",
      han_hoan_thanh: (formData.get("han_hoan_thanh") as string) || null,
      nguoi_phu_trach_id: selectedNhanSu || null,
      khoa_thuc_hien_id: selectedKhoa || null,
      to_cong_tac_id: selectedTo || null,
    };

    // Validate bằng Zod trước khi gửi để bắt lỗi ngay tại client
    const validation = congViecSchema.safeParse(rawPayload);
    if (!validation.success) {
      setLoading(false);
      const firstError = validation.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      toast.error(firstError);
      return;
    }

    try {
      if (initialData?.id) {
        await updateCongViec(initialData.id, validation.data);
        toast.success("Đã cập nhật và kích hoạt công việc!");
      } else {
        await createCongViec(validation.data);
        toast.success("Đã tạo công việc thành công!");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Lỗi hệ thống khi lưu công việc");
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = "w-full h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-sm font-semibold outline-none focus:border-[#026f17] transition-all";
  const labelStyles = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1";

  const defaultHanHoanThanh = initialData?.han_hoan_thanh 
    ? String(initialData.han_hoan_thanh).split("T")[0] 
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CỘT TRÁI */}
        <div className="space-y-6">
          <div>
            <label className={labelStyles}>Tiêu đề công việc *</label>
            <input name="tieu_de" required className={inputStyles} placeholder="Nhập tiêu đề..." defaultValue={initialData?.tieu_de || ""} />
          </div>

          <div>
            <label className={labelStyles}>Mô tả chi tiết</label>
            <textarea 
              name="mo_ta" 
              rows={4} 
              className="w-full rounded-[2rem] border-2 border-slate-100 bg-white p-5 text-sm font-medium outline-none focus:border-[#026f17] transition-all resize-none" 
              placeholder="Nội dung công việc..."
              defaultValue={initialData?.mo_ta || ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyles}>Mức độ ưu tiên</label>
              <select name="muc_do_uu_tien" defaultValue={initialData?.muc_do_uu_tien || "TRUNG_BINH"} className={inputStyles}>
                <option value="CAO">Khẩn cấp</option>
                <option value="TRUNG_BINH">Trung bình</option>
                <option value="THAP">Thấp</option>
              </select>
            </div>
            <div>
              <label className={labelStyles}>Hạn hoàn thành</label>
              <input type="date" name="han_hoan_thanh" className={inputStyles} defaultValue={defaultHanHoanThanh} />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyles}>Phạm vi</label>
              <select 
                name="loai_pham_vi" 
                required 
                className={inputStyles} 
                value={loaiPhamVi}
                onChange={(e) => setLoaiPhamVi(e.target.value)}
              >
                <option value="NOI_BO">Nội bộ Khoa</option>
                <option value="MANG_LUOI">Mạng lưới</option>
              </select>
            </div>
            <div>
              <label className={labelStyles}>Loại hình</label>
              <select name="loai_cong_viec" required className={inputStyles} defaultValue={initialData?.loai_cong_viec || "DINH_KY"}>
                <option value="DINH_KY">Định kỳ</option>
                <option value="DOT_XUAT">Đột xuất</option>
                <option value="KHAN_CAP">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelStyles}>Tổ công tác chuyên trách</label>
            <SearchableSelect 
              options={toCongTacOptions} 
              placeholder="Chọn tổ công tác..." 
              value={selectedTo}
              onChange={setSelectedTo}
            />
          </div>

          <div>
            <label className={labelStyles}>Người phụ trách</label>
            <SearchableSelect 
              options={filteredNhanSuOptions} 
              placeholder={selectedTo ? "Tìm trong tổ..." : "Chọn tổ trước..."} 
              value={selectedNhanSu}
              onChange={setSelectedNhanSu}
              disabled={!selectedTo && nhanSuOptions.length > 100} // Tránh lag nếu quá nhiều
            />
          </div>

          {loaiPhamVi === "MANG_LUOI" && (
            <div>
              <label className={labelStyles}>Khoa thực hiện</label>
              <SearchableSelect 
                options={khoaPhongOptions} 
                placeholder="Chọn khoa phòng..." 
                value={selectedKhoa}
                onChange={setSelectedKhoa}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-8 text-[11px] font-black uppercase tracking-widest text-slate-400"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-14 px-12 rounded-2xl bg-[#026f17] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#026f17]/20 hover:scale-[1.05] disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : (initialData?.id ? "Lưu & Kích hoạt" : "Tạo nhiệm vụ")}
        </button>
      </div>
    </form>
  );
}
