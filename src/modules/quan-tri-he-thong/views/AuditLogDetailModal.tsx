"use client";

import React, { useMemo } from "react";
import { X, ArrowRight, Plus, Minus, FileText } from "lucide-react";
import type { AuditLogRecord } from "../actions/audit-log.actions";

interface Props {
  log: AuditLogRecord | null;
  onClose: () => void;
}

interface DiffField {
  key: string;
  oldVal: any;
  newVal: any;
  type: "ADD" | "REMOVE" | "MODIFY" | "UNCHANGED";
}

export default function AuditLogDetailModal({ log, onClose }: Props) {
  // Helper to compute deep diff between old and new JSON objects
  const diffs = useMemo((): DiffField[] => {
    const oldObj = log?.old_data || {};
    const newObj = log?.new_data || {};

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort();

    return allKeys.map((key) => {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      const hasOld = key in oldObj;
      const hasNew = key in newObj;

      let type: "ADD" | "REMOVE" | "MODIFY" | "UNCHANGED" = "UNCHANGED";

      if (hasOld && !hasNew) {
        type = "REMOVE";
      } else if (!hasOld && hasNew) {
        type = "ADD";
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        type = "MODIFY";
      }

      return { key, oldVal, newVal, type };
    });
  }, [log]);

  const changedFields = useMemo(() => diffs.filter((d) => d.type !== "UNCHANGED"), [diffs]);
  const unchangedFields = useMemo(() => diffs.filter((d) => d.type === "UNCHANGED"), [diffs]);

  if (!log) return null;

  // Format complex objects gracefully
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">null</span>;
    if (typeof val === "object") {
      return (
        <pre className="text-[11px] font-mono bg-slate-50 p-2 rounded max-h-36 overflow-auto whitespace-pre-wrap leading-tight text-slate-700 max-w-xs md:max-w-md border border-slate-100">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    if (typeof val === "boolean") {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${val ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {val ? "TRUE" : "FALSE"}
        </span>
      );
    }
    return <span className="text-slate-800 break-words font-medium">{String(val)}</span>;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-green-50 text-green-700 border-green-200";
      case "UPDATE": return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Chi tiết thay đổi dữ liệu</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Bản ghi ID: <span className="font-mono text-slate-600 select-all">{log.record_id}</span>
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
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Bảng dữ liệu</span>
              <span className="text-sm font-black text-slate-700 font-mono mt-1 block">{log.table_name}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Thao tác</span>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold border mt-1.5 ${getActionColor(log.action)}`}>
                {log.action}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Người sửa đổi</span>
              <span className="text-sm font-black text-slate-700 mt-1 block truncate" title={log.user_email || ""}>
                {log.user_fullname}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian</span>
              <span className="text-xs font-semibold text-slate-600 mt-1.5 block">
                {new Date(log.changed_at).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>

          {/* Diffs Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Báo cáo so sánh thuộc tính ({changedFields.length} thay đổi)
              </h4>
            </div>

            {changedFields.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-500">Không phát hiện thay đổi thuộc tính nào trong log.</p>
                <p className="text-xs text-slate-400 mt-1">Điều này có thể xảy ra nếu hành động UPDATE được lưu mà không sửa trường nào.</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-100 rounded-xl shadow-sm">
                <table className="w-full border-collapse text-left text-xs table-fixed">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 w-1/4">Thuộc tính</th>
                      <th className="p-3 w-3/8">Giá trị cũ (Old)</th>
                      <th className="p-3 w-3/8">Giá trị mới (New)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {changedFields.map((field) => {
                      let rowBg = "hover:bg-slate-50/50";
                      let indicator: React.ReactNode = null;

                      if (field.type === "ADD") {
                        rowBg = "bg-green-50/20 hover:bg-green-50/40";
                        indicator = <Plus className="w-3.5 h-3.5 text-green-600 shrink-0" />;
                      } else if (field.type === "REMOVE") {
                        rowBg = "bg-red-50/20 hover:bg-red-50/40";
                        indicator = <Minus className="w-3.5 h-3.5 text-red-600 shrink-0" />;
                      } else if (field.type === "MODIFY") {
                        rowBg = "bg-blue-50/15 hover:bg-blue-50/30";
                        indicator = <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
                      }

                      return (
                        <tr key={field.key} className={`transition-colors ${rowBg}`}>
                          {/* Property Name */}
                          <td className="p-3 font-mono font-bold text-slate-600 select-all break-words align-top">
                            <div className="flex items-center gap-1.5">
                              {indicator}
                              <span>{field.key}</span>
                            </div>
                          </td>

                          {/* Old Value */}
                          <td className={`p-3 align-top ${field.type === "REMOVE" ? "text-red-700 font-medium" : "text-slate-500"}`}>
                            {field.type === "ADD" ? (
                              <span className="text-slate-400 italic text-[11px]">Chưa khởi tạo</span>
                            ) : (
                              renderValue(field.oldVal)
                            )}
                          </td>

                          {/* New Value */}
                          <td className={`p-3 align-top ${field.type === "ADD" ? "text-green-700 font-medium" : "text-slate-800"}`}>
                            {field.type === "REMOVE" ? (
                              <span className="text-slate-400 italic text-[11px]">Đã xóa</span>
                            ) : (
                              renderValue(field.newVal)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unchanged Fields Panel (Accordion-like collapsible) */}
          {unchangedFields.length > 0 && (
            <details className="group border border-slate-100 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
              <summary className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 cursor-pointer list-none select-none transition-colors">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Xem {unchangedFields.length} thuộc tính không đổi
                </span>
                <span className="text-xs text-slate-400 font-bold group-open:rotate-180 transition-transform duration-200">
                  ▼
                </span>
              </summary>
              <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {unchangedFields.map((field) => (
                  <div key={field.key} className="flex flex-col p-2 bg-slate-50/50 rounded-lg border border-slate-100/50 text-[11px]">
                    <span className="font-mono font-bold text-slate-500 block mb-0.5">{field.key}</span>
                    <span className="text-slate-700 break-words font-medium">
                      {typeof field.oldVal === "object" ? JSON.stringify(field.oldVal) : String(field.oldVal)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Đóng cửa sổ
          </button>
        </footer>

      </div>
    </div>
  );
}
