"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Upload, X, CheckCircle2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createHoatDong } from "../actions/hoat-dong.actions";

interface Props {
  congViecId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HoatDongForm({ congViecId, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phanTram, setPhanTram] = useState(50);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const noiDung = formData.get("noi_dung") as string;

    try {
      let fileUrl = "";
      let fileName = "";

      // 1. Upload file nếu có
      if (file) {
        // Sanitize tên file để tránh lỗi Invalid key của Supabase Storage
        const safeName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
          .replace(/[^a-zA-Z0-9.\-]/g, "_"); // Đổi ký tự đặc biệt và khoảng trắng thành _
        fileName = `${Date.now()}-${safeName}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from("cong-viec-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase
          .storage
          .from("cong-viec-files")
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
      }

      // 2. Gửi báo cáo qua Server Action
      await createHoatDong({
        id_cong_viec: congViecId,
        loai_hoat_dong: "BAO_CAO_TIEN_DO",
        noi_dung: noiDung,
        phan_tram_hoan_thanh: phanTram,
        file_url: fileUrl || undefined,
        ten_file: file?.name,
      });

      toast.success("Gửi báo cáo tiến độ thành công!");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi báo cáo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        
        {/* Nội dung báo cáo */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Nội dung báo cáo *</label>
          <textarea 
            name="noi_dung" 
            required
            rows={4}
            className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-[#026f17] transition-all resize-none"
            placeholder="Mô tả những gì bạn đã hoàn thành..." 
          />
        </div>

        {/* Phần trăm hoàn thành */}
        <div>
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Tiến độ công việc</label>
            <span className="text-xs font-black text-[#026f17]">{phanTram}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="5"
            value={phanTram}
            onChange={(e) => setPhanTram(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#026f17]"
          />
          <div className="flex justify-between mt-1 text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
            <span>Bắt đầu</span>
            <span>Hoàn thành</span>
          </div>
        </div>

        {/* Upload File */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Minh chứng đính kèm</label>
          <div className="relative group">
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept="image/*,.pdf,.doc,.docx"
            />
            <div className={`h-24 rounded-3xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${
              file ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-100 bg-slate-50 text-slate-400 group-hover:border-emerald-200"
            }`}>
              {file ? (
                <>
                  <FileText size={20} />
                  <div className="text-left">
                    <p className="text-[11px] font-bold truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[9px] uppercase font-black opacity-60">Nhấn để thay đổi file</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={20} className="group-hover:scale-110 transition-transform" />
                  <p className="text-[11px] font-bold uppercase tracking-widest">Chọn ảnh hoặc tài liệu minh chứng</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hủy</button>
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-8 rounded-2xl bg-[#026f17] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#026f17]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "Đang gửi báo cáo..." : "Gửi báo cáo tiến độ"}
        </button>
      </div>
    </form>
  );
}
