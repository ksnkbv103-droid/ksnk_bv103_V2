"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Send, Clock, Globe, BarChart } from "lucide-react";
import { createDeXuat } from "../actions/dexuat.actions";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DeXuatForm({ onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: formData.get("mo_ta") as string,
      loai_pham_vi: formData.get("loai_pham_vi") as "NOI_BO" | "MANG_LUOI",
      han_hoan_thanh: formData.get("han_hoan_thanh") as string,
      loai_cong_viec: formData.get("loai_cong_viec") as any,
      muc_do_uu_tien: formData.get("muc_do_uu_tien") as any,
    };

    try {
      await createDeXuat(payload);
      toast.success("Đã gửi đề xuất thành công! Đang chờ lãnh đạo phê duyệt.");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi đề xuất");
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = "w-full h-12 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-[#026f17] transition-all";
  const labelStyles = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
        
        {/* Tên đề xuất */}
        <div>
          <label className={labelStyles}>Tên công việc đề xuất *</label>
          <input 
            name="tieu_de" 
            required 
            className={inputStyles}
            placeholder="Ví dụ: Kiểm tra vệ sinh khoa Nội định kỳ..." 
          />
        </div>

        {/* Lý do/Mô tả */}
        <div>
          <label className={labelStyles}>Lý do & Mô tả chi tiết</label>
          <textarea 
            name="mo_ta" 
            rows={3}
            className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-[#026f17] transition-all resize-none"
            placeholder="Tại sao cần thực hiện công việc này?" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mức độ ưu tiên */}
          <div>
            <label className={labelStyles}>Mức độ quan trọng</label>
            <div className="relative">
               <BarChart size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <select name="muc_do_uu_tien" defaultValue="TRUNG_BINH" className={`${inputStyles} pl-12`}>
                  <option value="CAO">Khẩn cấp / Quan trọng</option>
                  <option value="TRUNG_BINH">Trung bình</option>
                  <option value="THAP">Bình thường</option>
               </select>
            </div>
          </div>

          {/* Loại hình */}
          <div>
            <label className={labelStyles}>Loại hình công việc</label>
            <select name="loai_cong_viec" defaultValue="DOT_XUAT" className={inputStyles}>
               <option value="DOT_XUAT">Đột xuất (Mặc định)</option>
               <option value="DINH_KY">Định kỳ</option>
               <option value="KHAN_CAP">Khẩn cấp</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Phạm vi */}
          <div>
            <label className={labelStyles}>Phạm vi áp dụng</label>
            <div className="relative">
              <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select name="loai_pham_vi" required className={`${inputStyles} pl-12`}>
                <option value="NOI_BO">Nội bộ Khoa KSNK</option>
                <option value="MANG_LUOI">Mạng lưới KSNK</option>
              </select>
            </div>
          </div>

          {/* Hạn mong muốn */}
          <div>
            <label className={labelStyles}>Hạn hoàn thành mong muốn</label>
            <div className="relative">
              <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" name="han_hoan_thanh" className={`${inputStyles} pl-12`} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 px-2">
        <button type="button" onClick={onCancel} className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Bỏ qua</button>
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-10 rounded-2xl bg-[#026f17] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#026f17]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          {loading ? "Đang gửi..." : <><Send size={14} /> Gửi đề xuất ngay</>}
        </button>
      </div>
    </form>
  );
}
