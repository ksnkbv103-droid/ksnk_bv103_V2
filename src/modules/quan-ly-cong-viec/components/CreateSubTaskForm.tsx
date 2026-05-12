"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createCongViec } from "../actions/cong-viec.actions";

interface Props {
  parentTaskId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateSubTaskForm({ parentTaskId, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: formData.get("mo_ta") as string,
      loai_pham_vi: "NOI_BO" as const,
      loai_cong_viec: "DOT_XUAT" as const,
      muc_do_uu_tien: "TRUNG_BINH" as const,
      han_hoan_thanh: formData.get("han_hoan_thanh") as string,
      cong_viec_cha_id: parentTaskId,
    };

    try {
      await createCongViec(payload);
      toast.success("Đã tạo công việc con thành công!");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo công việc con");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Tên nhiệm vụ con *</label>
          <input 
            name="tieu_de" 
            required 
            className="w-full h-12 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-[#026f17] transition-all"
            placeholder="Ví dụ: Chuẩn bị tài liệu..." 
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Mô tả ngắn</label>
          <textarea 
            name="mo_ta" 
            rows={2}
            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-[#026f17] transition-all resize-none"
            placeholder="Nội dung cần làm..." 
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Hạn hoàn thành</label>
          <input 
            type="date" 
            name="han_hoan_thanh" 
            className="w-full h-12 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-semibold outline-none" 
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hủy</button>
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-8 rounded-2xl bg-[#026f17] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#026f17]/20 hover:scale-[1.02] transition-all"
        >
          {loading ? "Đang xử lý..." : "Tạo nhiệm vụ con"}
        </button>
      </div>
    </form>
  );
}
