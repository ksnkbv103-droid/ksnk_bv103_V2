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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={C.blockSection}>Lịch sử khoa phòng</span>
        <span className="text-[11px] font-medium text-slate-500">{treatmentHistory.length} khoa</span>
      </div>

      <ResponsiveTableShell
        maxHeight="max-h-[min(320px,45dvh)]"
        mobileCards={
          <ul className="divide-y divide-slate-100">
            {treatmentHistory.map((stay, idx) => (
              <li key={idx} className="flex items-start justify-between gap-2 px-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{stayKhoaLabel(stay, khoas)}</p>
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
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className={`px-2.5 py-1.5 ${C.tableHeader}`}>Khoa điều trị</th>
              <th className={`px-2.5 py-1.5 ${C.tableHeader}`}>Từ ngày</th>
              <th className={`px-2.5 py-1.5 ${C.tableHeader}`}>Đến ngày</th>
              <th className="px-2.5 py-1.5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {treatmentHistory.map((stay, idx) => (
              <tr key={idx} className="hover:bg-slate-50 even:bg-slate-50/40">
                <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                  {stayKhoaLabel(stay, khoas)}
                </td>
                <td className="px-2.5 py-1.5 font-mono text-slate-600">
                  {formatDateVi(stay.ngay_vao)}
                </td>
                <td className="px-2.5 py-1.5 font-mono text-slate-600">
                  {stay.ngay_ra ? formatDateVi(stay.ngay_ra) : <span className="text-emerald-800">Hiện tại</span>}
                </td>
                <td className="px-2.5 py-1.5 text-right">
                  {allowedEdit && treatmentHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteStay(idx)}
                      className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                      title="Xóa khoa điều trị"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {treatmentHistory.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2.5 py-4 text-center text-slate-400">
                  Chưa khai báo lịch sử điều trị.
                </td>
              </tr>
            ) : null}
            {allowedEdit ? (
              <tr>
                <td className="px-2.5 py-1.5">
                  <select
                    value={newStayKhoaId}
                    onChange={(e) => setNewStayKhoaId(e.target.value)}
                    className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-medium"
                    aria-label="Chọn khoa phòng"
                  >
                    <option value="">Chọn khoa</option>
                    {khoas.map((k) => (
                      <option key={k.id} value={k.id}>
                        {formatKhoaPickerLabel({
                          ma_danh_muc: k.ma_danh_muc,
                          ten_danh_muc: k.ten_danh_muc,
                        })}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={newStayNgayVao}
                    min={cleanNgayVaoVien || undefined}
                    max={todayStr}
                    onChange={(e) => setNewStayNgayVao(e.target.value)}
                    className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs"
                    aria-label="Từ ngày"
                  />
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="date"
                    value={newStayNgayRa}
                    min={newStayNgayVao || cleanNgayVaoVien || undefined}
                    max={todayStr}
                    onChange={(e) => setNewStayNgayRa(e.target.value)}
                    className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs"
                    aria-label="Đến ngày"
                  />
                </td>
                <td className="px-2.5 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3 w-3" /> Thêm
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ResponsiveTableShell>
    </div>
  );
}

