"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateVi, todayYmdInVn } from "@/lib/format-datetime-vi";
import {
  LOAI_SU_CO_LABELS,
  type LoaiMucSoCan,
  type SoCanRow,
  type SuCoRow,
} from "../types";
import {
  getSoCanHistory,
  getSuCoList,
  deleteSuCo,
} from "../actions/chat-thai-do-vai.actions";

interface DayAggregated {
  ngay: string;
  sac_nhon_kg: number;
  con_lai_kg: number;
  thong_thuong_kg: number;
  tong_ct_kg: number;
  ty_le_ctln: number;
  ban_thuong_kg: number;
  ban_ln_kg: number;
  tong_ban_kg: number;
  sach_ve_kg: number;
  chenh_lech_kg: number;
}

export function TabLichSuSuCo() {
  // Mặc định 30 ngày gần đây
  const today = todayYmdInVn();
  const dDefault = new Date();
  dDefault.setDate(dDefault.getDate() - 30);
  const defaultTuNgay = dDefault.toISOString().slice(0, 10);

  const [tuNgay, setTuNgay] = useState<string>(defaultTuNgay);
  const [denNgay, setDenNgay] = useState<string>(today);
  const [loading, setLoading] = useState(false);

  const [soCanRows, setSoCanRows] = useState<SoCanRow[]>([]);
  const [suCoRows, setSuCoRows] = useState<SuCoRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sc, scList] = await Promise.all([
        getSoCanHistory(tuNgay, denNgay),
        getSuCoList(tuNgay, denNgay),
      ]);
      setSoCanRows(sc);
      setSuCoRows(scList);
    } catch {
      toast.error("Không thể tải lịch sử dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [tuNgay, denNgay]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gom nhóm các dòng cân theo ngày
  const aggregatedByDay = useMemo(() => {
    const map = new Map<string, DayAggregated>();

    for (const r of soCanRows) {
      if (!map.has(r.ngay_can)) {
        map.set(r.ngay_can, {
          ngay: r.ngay_can,
          sac_nhon_kg: 0,
          con_lai_kg: 0,
          thong_thuong_kg: 0,
          tong_ct_kg: 0,
          ty_le_ctln: 0,
          ban_thuong_kg: 0,
          ban_ln_kg: 0,
          tong_ban_kg: 0,
          sach_ve_kg: 0,
          chenh_lech_kg: 0,
        });
      }
      const item = map.get(r.ngay_can)!;
      const val = Number(r.khoi_luong_kg) || 0;

      switch (r.loai_muc) {
        case "CT_LAY_NHIEM_SAC_NHON":
          item.sac_nhon_kg += val;
          break;
        case "CT_LAY_NHIEM_CON_LAI":
          item.con_lai_kg += val;
          break;
        case "CT_THONG_THUONG":
          item.thong_thuong_kg += val;
          break;
        case "DO_VAI_BAN_THUONG":
          item.ban_thuong_kg += val;
          break;
        case "DO_VAI_BAN_LAY_NHIEM":
          item.ban_ln_kg += val;
          break;
        case "DO_VAI_SACH_VE":
          item.sach_ve_kg += val;
          break;
      }
    }

    // Tính tổng và tỷ lệ
    const list = Array.from(map.values()).map((d) => {
      const tongCtln = d.sac_nhon_kg + d.con_lai_kg;
      d.tong_ct_kg = Math.round((tongCtln + d.thong_thuong_kg) * 100) / 100;
      d.ty_le_ctln = d.tong_ct_kg > 0 ? Math.round((tongCtln / d.tong_ct_kg) * 1000) / 10 : 0;
      d.tong_ban_kg = Math.round((d.ban_thuong_kg + d.ban_ln_kg) * 100) / 100;
      d.chenh_lech_kg = Math.round((d.tong_ban_kg - d.sach_ve_kg) * 100) / 100;
      return d;
    });

    // Sắp xếp ngày giảm dần
    return list.sort((a, b) => b.ngay.localeCompare(a.ngay));
  }, [soCanRows]);

  const handleDeleteSuCo = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi sự cố này?")) return;
    try {
      const res = await deleteSuCo(id);
      if (res.success) {
        toast.success("Đã xóa sự cố.");
        setSuCoRows((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error(res.error || "Không thể xóa sự cố.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi hệ thống.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Bộ lọc khoảng thời gian */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">Khoảng thời gian:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-400">đến</span>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Bảng 1: Lịch sử Sổ cân theo ngày */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Lịch sử Sổ cân toàn viện theo ngày
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi nhận {aggregatedByDay.length} ngày có phát sinh số liệu trong kỳ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-3 py-3 text-right text-amber-800">CTLN Sắc nhọn</th>
                <th className="px-3 py-3 text-right text-amber-700">CTLN Khác</th>
                <th className="px-3 py-3 text-right text-emerald-700">CT Thường</th>
                <th className="px-3 py-3 text-right font-bold text-slate-900 bg-amber-50/30">Tổng CTYT (kg)</th>
                <th className="px-3 py-3 text-right text-slate-700">% CTLN</th>
                <th className="px-3 py-3 text-right text-sky-700 border-l border-slate-200">Đồ bẩn thường</th>
                <th className="px-3 py-3 text-right text-rose-700">Đồ bẩn LN</th>
                <th className="px-3 py-3 text-right font-bold text-slate-900 bg-sky-50/30">Tổng bẩn (kg)</th>
                <th className="px-3 py-3 text-right text-teal-700">Sạch về (kg)</th>
                <th className="px-4 py-3 text-right font-bold">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {aggregatedByDay.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    Chưa có số liệu sổ cân nào trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                aggregatedByDay.map((row) => (
                  <tr key={row.ngay} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                      {formatDateVi(row.ngay)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-amber-800">
                      {row.sac_nhon_kg > 0 ? row.sac_nhon_kg : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-700">
                      {row.con_lai_kg > 0 ? row.con_lai_kg : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">
                      {row.thong_thuong_kg > 0 ? row.thong_thuong_kg : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 bg-amber-50/20">
                      {row.tong_ct_kg.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold">
                      <span className={row.ty_le_ctln > 20 ? "text-rose-600" : "text-emerald-700"}>
                        {row.ty_le_ctln}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sky-700 border-l border-slate-100">
                      {row.ban_thuong_kg > 0 ? row.ban_thuong_kg : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-rose-700">
                      {row.ban_ln_kg > 0 ? row.ban_ln_kg : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 bg-sky-50/20">
                      {row.tong_ban_kg.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-teal-700">
                      {row.sach_ve_kg > 0 ? row.sach_ve_kg : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">
                      <span className={Math.abs(row.chenh_lech_kg) > 20 ? "text-amber-600" : "text-slate-700"}>
                        {row.chenh_lech_kg > 0 ? `+${row.chenh_lech_kg}` : row.chenh_lech_kg}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bảng 2: Danh sách sự cố an toàn sinh học */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Sổ theo dõi Sự cố an toàn sinh học (Chất thải & Đồ vải)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi nhận {suCoRows.length} sự cố phát hiện trong kỳ (gắn theo khoa trên nhãn túi/hộp)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Ngày phát hiện</th>
                <th className="px-3 py-3">Phân hệ</th>
                <th className="px-4 py-3">Loại sự cố</th>
                <th className="px-4 py-3">Khoa liên quan</th>
                <th className="px-5 py-3">Mô tả chi tiết</th>
                <th className="px-3 py-3 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {suCoRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Không ghi nhận sự cố an toàn sinh học nào trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                suCoRows.map((sc) => {
                  const isSharpsInLinen = sc.loai_su_co === "LAN_SAC_NHON_DO_VAI";
                  return (
                    <tr
                      key={sc.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSharpsInLinen ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {formatDateVi(sc.ngay_ghi_nhan)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            sc.phan_he === "CHAT_THAI"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {sc.phan_he === "CHAT_THAI" ? "Chất thải" : "Đồ vải"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-semibold ${
                            isSharpsInLinen
                              ? "bg-rose-600 text-white font-bold animate-pulse"
                              : "text-slate-800"
                          }`}
                        >
                          {LOAI_SU_CO_LABELS[sc.loai_su_co]?.label || sc.loai_su_co}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {sc.ten_khoa ? (
                          <span className="font-semibold text-indigo-700">{sc.ten_khoa}</span>
                        ) : (
                          <span className="text-slate-400">Chưa xác định</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-slate-700 max-w-xs truncate">
                        {sc.mo_ta || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSuCo(sc.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa sự cố"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
