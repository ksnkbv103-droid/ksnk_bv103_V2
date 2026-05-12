// src/components/shared/ImportExportPanel.tsx
"use client";

import React, { useRef } from "react";
import { Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react";

/**
 * Giao diện bảng điều khiển Import/Export
 * Dùng cho các trang quản trị danh mục, nhân sự...
 */
interface ImportExportPanelProps {
  onExportTemplate: () => void;
  onImportFile: (file: File) => void;
  isImporting?: boolean;
  title?: string;
  description?: string;
}

export default function ImportExportPanel({
  onExportTemplate,
  onImportFile,
  isImporting = false,
  title = "Quản lý Dữ liệu",
  description = "Tải file mẫu, điền dữ liệu và tải lên để cập nhật hệ thống."
}: ImportExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      // Reset input để có thể chọn lại cùng 1 file
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="premium-card glass-panel bg-white p-8 animate-in fade-in slide-in-from-top-4 duration-700 border-2 border-slate-100 shadow-xl shadow-slate-200/40 rounded-[32px]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Thông tin mô tả */}
        <div className="flex items-center gap-6 text-left flex-1">
          <div className="w-16 h-16 rounded-2xl bg-[#026f17]/10 text-[#026f17] flex items-center justify-center text-3xl shadow-inner shrink-0">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{title}</h3>
            <p className="text-slate-400 font-bold text-xs max-w-sm mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Nút thao tác */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Nút Tải Template */}
          <button
            onClick={onExportTemplate}
            className="h-14 px-8 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:border-[#026f17] hover:text-[#026f17] transition-all flex items-center gap-3 active:scale-95 shadow-sm"
          >
            <Download size={18} />
            Tải File Mẫu
          </button>

          {/* Nút Import (Input ẩn) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-14 px-10 rounded-2xl bg-[#026f17] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-[#026f17]/20 hover:shadow-[#026f17]/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
          >
            {isImporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Upload size={18} />
                Nhập Dữ Liệu
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Ghi chú bảo mật / hướng dẫn */}
      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
        Hỗ trợ định dạng .xlsx • Tự động cập nhật nếu trùng ID • Dung lượng tối đa 10MB
      </div>
    </div>
  );
}
