"use client";

import React, { useState } from "react";
import { X, ShieldAlert, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { approveMdmSuggestionAction } from "../danh-muc/actions/mdm-governance.actions";
import type { MdmSuggestionRow } from "@/lib/master-data/governance";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  suggestion: MdmSuggestionRow | null;
  onApproved: () => void;
}

const CATEGORY_TYPES = [
  { value: "KHOI_KHOA", label: "Khối khoa" },
  { value: "TO_CONG_TAC", label: "Tổ công tác" },
  { value: "CHUC_VU", label: "Chức vụ" },
  { value: "CHUC_DANH", label: "Chức danh" },
  { value: "NGHE_NGHIEP", label: "Nghề nghiệp" },
  { value: "LOAI_SU_CO", label: "Loại sự cố" },
  { value: "LOAI_MAY_TIET_KHUAN", label: "Loại máy tiệt khuẩn" },
  { value: "LOAI_NKBV", label: "Loại ca NKBV" },
  { value: "TRANG_THAI_NKBV_CA", label: "Trạng thái ca NKBV" },
  { value: "TRANG_THAI_CONG_VIEC", label: "Trạng thái công việc" },
  { value: "LOAI_CONG_VIEC", label: "Loại công việc" },
  { value: "CACH_THUC_GIAM_SAT", label: "Cách thức giám sát" },
  { value: "HINH_THUC_GIAM_SAT", label: "Hình thức giám sát" }
];

export default function MdmSuggestionApproveModal({ isOpen, onClose, suggestion, onApproved }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [fieldRole, setFieldRole] = useState<"FK_TO_DM" | "FK_TO_SPECIALIZED" | "TEXT_ENUM" | "DOMAIN_ATTRIBUTE" | "FACT_REFERENCE">("FK_TO_DM");
  const [sourceTable, setSourceTable] = useState("sys_lookup_value");
  const [sourceColumn, setSourceColumn] = useState("id");
  const [sourceLoaiDanhMuc, setSourceLoaiDanhMuc] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [notes, setNotes] = useState("");

  if (!isOpen || !suggestion) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fieldRole === "FK_TO_DM" && !sourceLoaiDanhMuc) {
      toast.error("Vui lòng chọn Loại danh mục liên kết cho khóa ngoại!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await approveMdmSuggestionAction(suggestion.id, {
        table_name: suggestion.table_name,
        column_name: suggestion.column_name,
        field_role: fieldRole,
        source_table: sourceTable,
        source_column: sourceColumn,
        source_loai_danh_muc: sourceLoaiDanhMuc,
        is_required: isRequired,
        notes: notes || `Phê duyệt tự động từ Gợi ý MDM (${suggestion.suggestion_type})`
      });

      if (res.success) {
        toast.success(`Đã kích hoạt bảo mật toàn vẹn thành công cho cột ${suggestion.column_name}!`);
        onApproved();
        onClose();
      } else {
        toast.error("Lỗi kích hoạt: " + res.error);
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Phê duyệt &amp; Thiết lập Bảo vệ</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Kích hoạt trigger kiểm soát toàn vẹn dữ liệu cứng
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 text-xs">
          {/* Readonly Table Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bảng dữ liệu</span>
              <span className="font-mono font-bold text-slate-700 block mt-0.5">{suggestion.table_name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cột khóa ngoại</span>
              <span className="font-mono font-bold text-emerald-600 block mt-0.5">{suggestion.column_name}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Vai trò trường dữ liệu (Field Role)*</label>
              <select
                value={fieldRole}
                onChange={(e) => setFieldRole(e.target.value as any)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="FK_TO_DM">Khóa ngoại trỏ đến danh mục gộp (FK_TO_DM)</option>
                <option value="FK_TO_SPECIALIZED">Khóa ngoại chuyên biệt (FK_TO_SPECIALIZED)</option>
                <option value="TEXT_ENUM">Cột Enum thô (TEXT_ENUM)</option>
              </select>
            </div>

            {fieldRole === "FK_TO_DM" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Bảng nguồn gộp*</label>
                    <input
                      type="text"
                      value={sourceTable}
                      disabled
                      className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Cột nguồn*</label>
                    <input
                      type="text"
                      value={sourceColumn}
                      disabled
                      className="w-full h-10 px-3 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Loại danh mục bắt buộc (category_type)*</label>
                  <select
                    value={sourceLoaiDanhMuc}
                    onChange={(e) => setSourceLoaiDanhMuc(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">-- Chọn loại danh mục lookup --</option>
                    {CATEGORY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">
                    Trigger Postgres sẽ chặn đứng bất kỳ giao dịch ghi nào nếu bản ghi trỏ tới không đúng category_type này.
                  </p>
                </div>
              </>
            )}

            {/* Checkbox required */}
            <div className="flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                id="isRequired"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-200 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isRequired" className="font-bold text-slate-600 cursor-pointer select-none">
                Bắt buộc nhập (Is Required - Chặn giá trị NULL)
              </label>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Ghi chú vận hành</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Ràng buộc loại nhân sự y tế toàn viện..."
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Action Footer */}
          <footer className="flex items-center justify-end pt-4 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg font-bold uppercase tracking-wider transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang kích hoạt...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Kích hoạt Bảo vệ
                </>
              )}
            </button>
          </footer>
        </form>

      </div>
    </div>
  );
}
