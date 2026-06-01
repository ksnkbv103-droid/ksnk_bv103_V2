"use client";

import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { DepartmentStay } from "../types/nkbv-verification";

interface NkbvStayHistoryTableProps {
  treatmentHistory: DepartmentStay[];
  onAddStay: (newStay: DepartmentStay) => void;
  onDeleteStay: (index: number) => void;
  khoas: Array<{ id: string; ten_danh_muc: string }>;
  allowedEdit: boolean;
  ngayVaoVien?: string;
  ngayPhatHien?: string;
}

export default function NkbvStayHistoryTable({
  treatmentHistory,
  onAddStay,
  onDeleteStay,
  khoas,
  allowedEdit,
  ngayVaoVien,
  ngayPhatHien,
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
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
          🏢 Lịch sử điều trị khoa phòng
        </span>
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
          {treatmentHistory.length} khoa
        </span>
      </div>

      {treatmentHistory.length > 0 ? (
        <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-black text-slate-500 uppercase text-[10px]">
                  Khoa điều trị
                </th>
                <th className="px-3 py-2 font-black text-slate-500 uppercase text-[10px]">
                  Từ ngày
                </th>
                <th className="px-3 py-2 font-black text-slate-500 uppercase text-[10px]">
                  Đến ngày
                </th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {treatmentHistory.map((stay, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-bold text-slate-800">
                    {stay.ten_khoa}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">
                    {stay.ngay_vao
                      ? new Date(stay.ngay_vao).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">
                    {stay.ngay_ra ? (
                      new Date(stay.ngay_ra).toLocaleDateString("vi-VN")
                    ) : (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
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
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic text-center py-4 bg-white border border-slate-100 rounded-xl">
          Chưa khai báo lịch sử điều trị.
        </div>
      )}

      {/* Add Stay Inputs */}
      {allowedEdit && (
        <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-3 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase block">
            ➕ Khai báo Chuyển khoa / Nhập khoa mới
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Chọn khoa phòng
              </label>
              <select
                value={newStayKhoaId}
                onChange={(e) => setNewStayKhoaId(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
              >
                <option value="">-- Chọn khoa --</option>
                {khoas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ten_danh_muc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Từ ngày (Nhập khoa)
              </label>
              <input
                type="date"
                value={newStayNgayVao}
                min={cleanNgayVaoVien || undefined}
                max={todayStr}
                onChange={(e) => setNewStayNgayVao(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                Đến ngày (Để trống nếu là khoa hiện tại)
              </label>
              <input
                type="date"
                value={newStayNgayRa}
                min={newStayNgayVao || cleanNgayVaoVien || undefined}
                max={todayStr}
                onChange={(e) => setNewStayNgayRa(e.target.value)}
                className="w-full rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg bg-[#026f17] hover:bg-[#026615] px-4 py-1.5 text-xs font-black uppercase text-white shadow transition flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Thêm khoa điều trị
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
