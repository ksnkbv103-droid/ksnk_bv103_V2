"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  getSystemAuditLogs, 
  getDistinctAuditTables, 
  type AuditLogRecord, 
  type AuditLogFilters 
} from "../actions/audit-log.actions";
import { toast } from "sonner";
import { 
  Filter, 
  RefreshCw, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Activity 
} from "lucide-react";
import AuditLogDetailModal from "./AuditLogDetailModal";

const LIMIT = 15;

export default function AuditTrailView() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  // Filters State
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<"" | "INSERT" | "UPDATE" | "DELETE">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Distinct Tables for Filter Dropdown
  const [distinctTables, setDistinctTables] = useState<string[]>([]);
  
  // Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const res = await getDistinctAuditTables();
      if (res.success) {
        setDistinctTables(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load distinct table names", err);
    }
  }, []);

  const loadLogs = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const offset = (targetPage - 1) * LIMIT;
      const filters: AuditLogFilters = {
        limit: LIMIT,
        offset,
      };

      if (tableFilter) filters.tableName = tableFilter;
      if (actionFilter) filters.action = actionFilter;
      if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) {
        // Cuối ngày lọc của dateTo
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        filters.dateTo = endOfDay.toISOString();
      }

      const res = await getSystemAuditLogs(filters);
      if (res.success) {
        setLogs(res.data || []);
        setTotal(res.totalCount || 0);
      } else {
        toast.error("Lỗi tải nhật ký: " + res.error);
      }
    } catch (e: any) {
      toast.error("Không thể kết nối đến máy chủ: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [tableFilter, actionFilter, dateFrom, dateTo]);

  // Initial load
  useEffect(() => {
    void loadTables();
    void loadLogs(1);
  }, [loadTables]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadLogs(1);
  };

  const handleResetFilters = () => {
    setTableFilter("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    // Cần load ngay với tham số rỗng
    setTimeout(() => {
      void loadLogs(1);
    }, 0);
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    void loadLogs(newPage);
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-green-50 text-green-700 border-green-200";
      case "UPDATE": return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filters Panel */}
      <form 
        onSubmit={handleApplyFilters}
        className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Filter className="w-4 h-4 text-[#026f17]" />
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Bộ lọc tìm kiếm nhật ký</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Table Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bảng dữ liệu</label>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17] focus:outline-none"
            >
              <option value="">Tất cả các bảng</option>
              {distinctTables.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thao tác</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17] focus:outline-none"
            >
              <option value="">Tất cả thao tác</option>
              <option value="INSERT">INSERT (Thêm mới)</option>
              <option value="UPDATE">UPDATE (Cập nhật)</option>
              <option value="DELETE">DELETE (Xóa)</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ ngày</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17] focus:outline-none"
              />
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đến ngày</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17] focus:outline-none"
              />
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Đặt lại bộ lọc
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white bg-[#026f17] hover:bg-[#015a12] rounded-lg shadow-sm transition-all focus:outline-none"
          >
            <RefreshCw className="w-3 h-3" />
            Áp dụng lọc
          </button>
        </div>
      </form>

      {/* Main Data Table */}
      <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse text-left text-xs table-fixed">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 w-[18%]">Thời gian</th>
                <th className="p-4 w-[12%]">Thao tác</th>
                <th className="p-4 w-[20%]">Bảng dữ liệu</th>
                <th className="p-4 w-[25%]">Bản ghi (ID)</th>
                <th className="p-4 w-[17%]">Người thực hiện</th>
                <th className="p-4 w-[8%] text-center">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center align-middle">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold tracking-widest text-[9px] uppercase">
                        Đang truy vấn dữ liệu kiểm toán...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center align-middle">
                    <div className="flex flex-col items-center gap-2.5 text-slate-400">
                      <Activity className="w-12 h-12 opacity-30" />
                      <p className="text-sm font-bold">Không tìm thấy nhật ký hệ thống phù hợp.</p>
                      <p className="text-xs">Thử nới lỏng bộ lọc hoặc khoảng thời gian tìm kiếm.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Time */}
                    <td className="p-4 font-medium text-slate-500 whitespace-nowrap">
                      {new Date(log.changed_at).toLocaleString("vi-VN")}
                    </td>

                    {/* Action */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Table Name */}
                    <td className="p-4 font-mono font-bold text-slate-600 truncate" title={log.table_name}>
                      {log.table_name}
                    </td>

                    {/* Record ID */}
                    <td className="p-4 font-mono text-[11px] text-slate-500 select-all truncate" title={log.record_id}>
                      {log.record_id}
                    </td>

                    {/* Changed By */}
                    <td className="p-4 truncate" title={log.user_email || ""}>
                      <span className="font-bold text-slate-700 block">{log.user_fullname}</span>
                      {log.user_email && <span className="text-[10px] text-slate-400 block mt-0.5">{log.user_email}</span>}
                    </td>

                    {/* Details Action */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 hover:bg-[#026f17]/10 text-slate-400 hover:text-[#026f17] rounded-lg transition-colors"
                        title="Xem chi tiết thay đổi JSON"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <div className="text-xs text-slate-500 font-semibold">
              Hiển thị <span className="text-slate-800 font-bold">{logs.length}</span> trên{" "}
              <span className="text-slate-800 font-bold">{total}</span> nhật ký
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-bold text-slate-700 px-3">
                Trang {page} / {totalPages}
              </span>
              
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Diff Modal */}
      {selectedLog && (
        <AuditLogDetailModal 
          log={selectedLog} 
          onClose={() => setSelectedLog(null)} 
        />
      )}
    </div>
  );
}
