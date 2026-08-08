"use client";

import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { DepartmentStay } from "../types/nkbv-verification";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import {
  formatKhoaCompactLabel,
  formatKhoaPickerLabel,
} from "@/lib/domain/khoa-display";
import { formatDateVi } from "@/lib/format-datetime-vi";

interface NkbvStayHistoryTableProps {
  treatmentHistory: DepartmentStay[];
  onAddStay: (newStay: DepartmentStay) => void;
  onDeleteStay: (index: number) => void;
  khoas: Array<{ id: string; ten_danh_muc: string; ma_danh_muc?: string }>;
  allowedEdit: boolean;
  ngayVaoVien?: string;
  ngayPhatHien?: string;
}

function stayKhoaLabel(stay: DepartmentStay, khoas: NkbvStayHistoryTableProps["khoas"]) {
  const opt = khoas.find((k) => k.id === stay.khoa_id);
  return formatKhoaCompactLabel({
    ma_khoa: stay.ma_khoa || opt?.ma_danh_muc,
    ten_khoa: stay.ten_khoa || opt?.ten_danh_muc,
  });
}

export default function NkbvStayHistoryTable({
  treatmentHistory,
  onAddStay,
  onDeleteStay,
  khoas,
  allowedEdit,
  ngayVaoVien,
}: NkbvStayHistoryTableProps) {
  const [newStayKhoaId, setNewStayKhoaId] = useState("");
  const [newStayNgayVao, setNewStayNgayVao] = useState("");
  const [newStayNgayRa, setNewStayNgayRa] = useState("");

  const handleAdd = () => {
    if (!newStayKhoaId) {
      toast.error("Vui lòng chọn khoa phòng!");
      return;
    }
    if (!newStayNgayVao) {
      toast.error("Vui lòng chọn ngày vào khoa!");
      return;
    }
    if (newStayNgayRa && newStayNgayRa < newStayNgayVao) {
      toast.error("Ngày ra phải sau hoặc bằng ngày vào!");
      return;
    }
    
    const khoaOpt = khoas.find((k) => k.id === newStayKhoaId);
    const ten_khoa = khoaOpt ? khoaOpt.ten_danh_muc : "Khoa đã chọn";

    const newStay: DepartmentStay = {
      khoa_id: newStayKhoaId,
      ten_khoa,
      ma_khoa: khoaOpt?.ma_danh_muc,
      ngay_vao: newStayNgayVao,
      ngay_ra: newStayNgayRa || undefined,
    };

    onAddStay(newStay);

    // Reset inputs
    setNewStayKhoaId("");
    setNewStayNgayVao("");
    setNewStayNgayRa("");
  };

  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <span className={`${C.blockSection} flex items-center gap-1`}>🏢 Lịch sử điều trị khoa phòng</span>
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
          {treatmentHistory.length} khoa
        </span>
      </div>

      {treatmentHistory.length > 0 ? (
        <ResponsiveTableShell
          unboxed
          className="border border-slate-100 rounded-xl bg-white shadow-sm"
          maxHeight="max-h-[min(320px,45dvh)]"
          mobileCards={
            <ul className="divide-y divide-slate-100">
              {treatmentHistory.map((stay, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2 px-3 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{stayKhoaLabel(stay, khoas)}</p>
                    <p className="mt-1 text-xs font-mono text-slate-600">
                      {formatDateVi(stay.ngay_vao)}
                      {" → "}
                      {stay.ngay_ra ? formatDateVi(stay.ngay_ra) : "Hiện tại"}
                    </p>
                  </div>
                  {allowedEdit && treatmentHistory.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onDeleteStay(idx)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors touch-manipulation hover:bg-red-50"
                      title="Xóa khoa điều trị"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          }
        >
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className={`px-3 py-2 ${C.tableHeader}`}>
                  Khoa điều trị
                </th>
                <th className={`px-3 py-2 ${C.tableHeader}`}>
                  Từ ngày
                </th>
                <th className={`px-3 py-2 ${C.tableHeader}`}>
                  Đến ngày
                </th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {treatmentHistory.map((stay, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-bold text-slate-800">
                    {stayKhoaLabel(stay, khoas)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">
                    {formatDateVi(stay.ngay_vao)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">
                    {stay.ngay_ra ? (
                      formatDateVi(stay.ngay_ra)
                    ) : (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                        Hiện tại
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {allowedEdit && treatmentHistory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteStay(idx)}
                        className="rounded-lg p-1 text-red-500 hover:bg-red-50 transition"
                        title="Xóa khoa điều trị"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTableShell>
      ) : (
        <div className="text-xs text-slate-400 italic text-center py-4 bg-white border border-slate-100 rounded-xl">
          Chưa khai báo lịch sử điều trị.
        </div>
      )}

      {/* Add Stay Inputs */}
      {allowedEdit && (
        <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">
            ➕ Khai báo Chuyển khoa / Nhập khoa mới
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-[11px] font-medium text-slate-500 block mb-1">
                Chọn khoa phòng
              </label>
              <select
                value={newStayKhoaId}
                onChange={(e) => setNewStayKhoaId(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="">-- Chọn khoa --</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {formatKhoaPickerLabel({
                      ma_danh_muc: k.ma_danh_muc,
                      ten_danh_muc: k.ten_danh_muc,
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[11px] font-medium text-slate-500 block mb-1">
                Từ ngày (Nhập khoa)
              </label>
              <input
                type="date"
                value={newStayNgayVao}
                min={cleanNgayVaoVien || undefined}
                max={todayStr}
                onChange={(e) => setNewStayNgayVao(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[11px] font-medium text-slate-500 block mb-1">
                Đến ngày (Để trống nếu là khoa hiện tại)
              </label>
              <input
                type="date"
                value={newStayNgayRa}
                min={newStayNgayVao || cleanNgayVaoVien || undefined}
                max={todayStr}
                onChange={(e) => setNewStayNgayRa(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg bg-[var(--primary)] hover:bg-[#026615] px-4 py-1.5 text-xs font-black uppercase text-white shadow transition flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Thêm khoa điều trị
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
