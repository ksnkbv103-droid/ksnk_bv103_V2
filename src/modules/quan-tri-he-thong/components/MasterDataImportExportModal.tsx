"use client";

import React, { useState, useRef, useMemo } from "react";
import { X, Download, Upload, AlertTriangle, CheckCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  exportDanhMucTemplate, 
  parseExcelFile, 
  type DanhMucType 
} from "../lib/excel-io.helpers";
import {
  importBulkKhoaPhong,
  importBulkHoaChat,
  importBulkThietBi,
  importBulkNhanSu
} from "../actions/master-import.actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: DanhMucType;
}

interface ValidationResult {
  rowIdx: number;
  isValid: boolean;
  errors: string[];
  data: Record<string, any>;
}

export default function MasterDataImportExportModal({ isOpen, onClose, type }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const catalogLabel = useMemo(() => {
    switch (type) {
      case "khoa-phong": return "Khoa phòng";
      case "hoa-chat": return "Hóa chất";
      case "thiet-bi": return "Thiết bị & máy";
      case "nhan-su": return "Hồ sơ nhân sự";
      default: return "Danh mục";
    }
  }, [type]);

  // Client-side validations for each parsed row
  const validationResults = useMemo((): ValidationResult[] => {
    return parsedRows.map((row, idx) => {
      const errors: string[] = [];
      const data = { ...row };

      if (type === "khoa-phong") {
        if (!data.ma_khoa) errors.push("Thiếu Mã khoa phòng");
        if (data.ma_khoa && !/^[A-Z0-9_-]+$/.test(data.ma_khoa)) errors.push("Mã khoa chỉ chứa chữ IN HOA, số, gạch dưới");
        if (!data.ten_khoa) errors.push("Thiếu Tên khoa phòng");
        if (data.so_bac_si && parseInt(data.so_bac_si) < 0) errors.push("Số bác sĩ không được âm");
        if (data.so_dieu_duong && parseInt(data.so_dieu_duong) < 0) errors.push("Số điều dưỡng không được âm");
        if (data.so_giuong_benh_thuong && parseInt(data.so_giuong_benh_thuong) < 0) errors.push("Số giường thường không được âm");
        if (data.so_giuong_cap_cuu && parseInt(data.so_giuong_cap_cuu) < 0) errors.push("Số giường cấp cứu không được âm");
      } 
      else if (type === "hoa-chat") {
        if (!data.ma_hoa_chat) errors.push("Thiếu Mã hóa chất");
        if (!data.ten_hoa_chat) errors.push("Thiếu Tên hóa chất");
        if (data.nguong_ton_toi_thieu && parseFloat(data.nguong_ton_toi_thieu) < 0) errors.push("Ngưỡng tồn không được âm");
        if (data.han_su_dung && !/^\d{4}-\d{2}-\d{2}$/.test(data.han_su_dung)) errors.push("Hạn sử dụng phải có dạng YYYY-MM-DD");
      } 
      else if (type === "thiet-bi") {
        if (!data.ma_thiet_bi) errors.push("Thiếu Mã thiết bị");
        if (!data.ten_thiet_bi) errors.push("Thiếu Tên thiết bị");
        if (data.chu_ky_bao_tri_ngay && parseInt(data.chu_ky_bao_tri_ngay) <= 0) errors.push("Chu kỳ bảo trì phải lớn hơn 0");
        if (data.ngay_dua_vao_su_dung && !/^\d{4}-\d{2}-\d{2}$/.test(data.ngay_dua_vao_su_dung)) errors.push("Ngày sử dụng phải có dạng YYYY-MM-DD");
      } 
      else if (type === "nhan-su") {
        if (!data.ma_nv) errors.push("Thiếu Mã nhân viên");
        if (!data.ho_ten) errors.push("Thiếu Họ tên nhân sự");
        if (!data.ma_khoa) errors.push("Thiếu Mã khoa phòng");
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Email đăng nhập sai định dạng");
        if (data.ngay_sinh && !/^\d{4}-\d{2}-\d{2}$/.test(data.ngay_sinh)) errors.push("Ngày sinh phải có dạng YYYY-MM-DD");
      }

      return {
        rowIdx: idx + 4, // 4-based row index matching Excel sheet
        isValid: errors.length === 0,
        errors,
        data
      };
    });
  }, [parsedRows, type]);

  const errorCount = useMemo(() => {
    return validationResults.filter((r) => !r.isValid).length;
  }, [validationResults]);

  const handleDownloadTemplate = async () => {
    try {
      toast.info(`Đang tải tệp Excel mẫu cho danh mục: ${catalogLabel}...`);
      await exportDanhMucTemplate(type);
      toast.success("Đã tải tệp mẫu thành công!");
    } catch (err: any) {
      toast.error("Không thể xuất tệp mẫu: " + err.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    try {
      const rows = await parseExcelFile(selectedFile);
      setParsedRows(rows);
      toast.success(`Đã đọc tệp Excel: phát hiện ${rows.length} dòng dữ liệu.`);
    } catch (err: any) {
      setFile(null);
      setParsedRows([]);
      toast.error("Lỗi đọc file Excel: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.name.endsWith(".xlsx") && !droppedFile.name.endsWith(".xls")) {
      toast.error("Vui lòng kéo thả tệp tin định dạng Excel (.xlsx, .xls)");
      return;
    }

    setFile(droppedFile);
    setParsing(true);
    try {
      const rows = await parseExcelFile(droppedFile);
      setParsedRows(rows);
      toast.success(`Đã đọc tệp Excel: phát hiện ${rows.length} dòng dữ liệu.`);
    } catch (err: any) {
      setFile(null);
      setParsedRows([]);
      toast.error("Lỗi đọc file Excel: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || errorCount > 0) return;
    setImporting(true);
    try {
      let res;
      if (type === "khoa-phong") {
        res = await importBulkKhoaPhong(parsedRows);
      } else if (type === "hoa-chat") {
        res = await importBulkHoaChat(parsedRows);
      } else if (type === "thiet-bi") {
        res = await importBulkThietBi(parsedRows);
      } else if (type === "nhan-su") {
        res = await importBulkNhanSu(parsedRows);
      }

      if (res?.success) {
        toast.success(`Nhập dữ liệu thành công! Đã ghi ${res.inserted} bản ghi vào ${catalogLabel}.`);
        onClose();
        // Refresh page data
        window.location.reload();
      } else {
        toast.error("Lỗi ghi dữ liệu: " + res?.error);
      }
    } catch (err: any) {
      toast.error("Không thể kết nối đến máy chủ: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Preview Columns mapping depending on Type
  const previewHeaders = useMemo(() => {
    switch (type) {
      case "khoa-phong":
        return ["Mã khoa", "Tên khoa", "Khối khoa", "Mô tả", "Bác sĩ", "Đ.Dưỡng", "Giường thường", "Giường CC"];
      case "hoa-chat":
        return ["Mã hóa chất", "Tên hóa chất", "Loại", "ĐVT", "Hạn dùng", "Tồn tối thiểu"];
      case "thiet-bi":
        return ["Mã thiết bị", "Tên thiết bị", "Loại máy", "Ngày sử dụng", "Chu kỳ bảo trì"];
      case "nhan-su":
        return ["Mã NV", "Họ tên", "Email", "SĐT", "Giới tính", "Mã khoa", "Mã tổ", "Chức vụ"];
    }
  }, [type]);

  const previewKeys = useMemo(() => {
    switch (type) {
      case "khoa-phong":
        return ["ma_khoa", "ten_khoa", "ten_khoi", "mo_ta_chuc_nang", "so_bac_si", "so_dieu_duong", "so_giuong_benh_thuong", "so_giuong_cap_cuu"];
      case "hoa-chat":
        return ["ma_hoa_chat", "ten_hoa_chat", "loai_hoa_chat", "don_vi_tinh", "han_su_dung", "nguong_ton_toi_thieu"];
      case "thiet-bi":
        return ["ma_thiet_bi", "ten_thiet_bi", "ten_loai_may", "ngay_dua_vao_su_dung", "chu_ky_bao_tri_ngay"];
      case "nhan-su":
        return ["ma_nv", "ho_ten", "email", "so_dien_thoai", "gioi_tinh", "ma_khoa", "ma_to", "ten_chuc_vu"];
    }
  }, [type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tải dữ liệu hàng loạt: {catalogLabel}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Nhập danh mục từ tệp mẫu chuẩn Excel
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Step 1: Download Template */}
          <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-800">Bước 1: Tải tệp mẫu Excel chuẩn</h4>
              <p className="text-xs text-emerald-700/80 leading-relaxed max-w-2xl">
                Để bảo đảm nhập liệu chính xác, vui lòng tải file Excel mẫu đã được cấu hình sẵn tiêu đề, định dạng cột và ghi chú chỉ dẫn cho danh mục <strong>{catalogLabel}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider hover:bg-emerald-700 shadow-sm transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Tải tệp Excel Mẫu
            </button>
          </div>

          {/* Step 2: Upload Area */}
          {!file && (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleTriggerUpload}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-emerald-50/10 cursor-pointer transition-all duration-200 group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden" 
              />
              <div className="p-4 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-emerald-600 transition-colors">
                {parsing ? (
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Kéo và thả tệp Excel của bạn vào đây</p>
                <p className="text-xs text-slate-400">hoặc nhấp chuột để chọn tệp từ thiết bị của bạn (Chấp nhận .xlsx, .xls)</p>
              </div>
            </div>
          )}

          {/* Step 3: Parse results and Preview */}
          {file && (
            <div className="space-y-4">
              
              {/* File details banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-emerald-100 rounded text-emerald-700">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-700 block truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Kích thước: {(file.size / 1024).toFixed(1)} KB • Phát hiện {parsedRows.length} dòng
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider transition-colors"
                >
                  Chọn tệp khác
                </button>
              </div>

              {/* Validation Alert */}
              {errorCount > 0 ? (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">Phát hiện lỗi dữ liệu ({errorCount} dòng lỗi)</h4>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Có <strong>{errorCount} dòng dữ liệu bị lỗi nghiêm trọng</strong>. Vui lòng mở lại tệp Excel, sửa các trường bị thiếu hoặc sai định dạng theo gợi ý bôi đỏ bên dưới, sau đó tải lại tệp. Nút xác nhận bị khóa cho đến khi tệp không còn lỗi.
                    </p>
                  </div>
                </div>
              ) : parsedRows.length > 0 ? (
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-green-800 uppercase tracking-wider">Tệp tin hoàn hảo (Hợp lệ 100%)</h4>
                    <p className="text-xs text-green-700 leading-relaxed">
                      Tất cả <strong>{parsedRows.length} dòng dữ liệu đều hợp lệ</strong> và đã sẵn sàng được đẩy lên cơ sở dữ liệu. Bấm nút "Bắt đầu tải lên" để lưu.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Data Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Bảng xem trước dữ liệu (Xem trước tối đa 10 dòng đầu)</h4>
                  <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                            <th className="p-3 w-[80px] text-center">Dòng Excel</th>
                            <th className="p-3 w-[150px]">Trạng thái / Lỗi phát hiện</th>
                            {previewHeaders?.map((h) => (
                              <th key={h} className="p-3 w-[150px]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResults.slice(0, 10).map((result, idx) => {
                            const { rowIdx, isValid, errors, data } = result;
                            return (
                              <tr key={idx} className={`transition-colors ${isValid ? "hover:bg-slate-50/40" : "bg-rose-50/15 hover:bg-rose-50/25"}`}>
                                {/* Row Index */}
                                <td className="p-3 font-mono font-bold text-slate-400 text-center">{rowIdx}</td>

                                {/* Validation Cell */}
                                <td className="p-3 align-middle">
                                  {isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 uppercase">
                                      <CheckCircle className="w-3 h-3 shrink-0" />
                                      Hợp lệ
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-0.5 text-[10px] text-rose-600 font-medium">
                                      {errors.map((err, eIdx) => (
                                        <span key={eIdx} className="flex items-center gap-1">
                                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                          {err}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>

                                {/* Dynamic Columns */}
                                {previewKeys?.map((key) => {
                                  const cellVal = data[key];
                                  return (
                                    <td key={key} className={`p-3 truncate align-middle font-sans font-medium ${!isValid && !cellVal && (key.startsWith("ma_") || key === "ten_khoa" || key === "ho_ten") ? "bg-rose-100/30 text-rose-800" : "text-slate-700"}`} title={cellVal || ""}>
                                      {cellVal || <span className="text-slate-300 italic text-[11px]">Trống</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {parsedRows.length > 10 && (
                    <p className="text-[10px] font-bold text-slate-400 italic text-center">
                      ...và {parsedRows.length - 10} dòng dữ liệu khác nằm ở bên dưới...
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors"
          >
            Đóng cửa sổ
          </button>
          {file && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || errorCount > 0 || parsedRows.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#026f17] hover:bg-[#015a12] text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm focus:outline-none"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang tải lên DB...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Bắt đầu tải lên
                </>
              )}
            </button>
          )}
        </footer>

      </div>
    </div>
  );
}
