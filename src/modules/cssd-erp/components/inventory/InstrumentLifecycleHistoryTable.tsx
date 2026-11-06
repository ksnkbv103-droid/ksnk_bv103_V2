"use client";

import React, { useCallback, useEffect, useState } from "react";
import { History, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchInstrumentLifecycleHistoryAction,
  type LifecycleHistoryItem,
} from "@/modules/cssd-erp/actions/cssd-lifecycle.actions";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";

const VARIANT_STYLES: Record<LifecycleHistoryItem["badge_variant"], string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  slate: "bg-slate-100 text-slate-700 border-slate-300",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  red: "bg-red-50 text-red-700 border-red-200",
};

export default function InstrumentLifecycleHistoryTable() {
  const [items, setItems] = useState<LifecycleHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInstrumentLifecycleHistoryAction({
        loaiGiaoDich: filterType,
        limit: 100,
      });
      if (!res.success) {
        toast.error(res.error || "Không thể tải lịch sử biến động.");
        return;
      }
      setItems(res.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi tải lịch sử.");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = items.filter((item) => {
    if (filterType === "ALL") return true;
    if (filterType === "NHAP_MOI") return item.badge_label === "Nhập mới từ VT/TB";
    if (filterType === "TRA_KHO") return item.badge_label === "Trả về kho lẻ";
    if (filterType === "BO_SUNG") return item.loai_giao_dich === "BO_SUNG";
    if (filterType === "DIEU_CHUYEN") return item.loai_giao_dich === "DIEU_CHUYEN";
    if (filterType === "LOAI_BIEN") return item.badge_label === "Loại biên hao mòn";
    if (filterType === "SU_CO") return item.badge_label === "Báo hỏng sự cố" || item.badge_label === "Báo mất sự cố";
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <History size={14} /> Lọc:
          </span>
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "NHAP_MOI", label: "Nhập mới VT/TB" },
            { key: "BO_SUNG", label: "Bổ sung vào bộ" },
            { key: "TRA_KHO", label: "Trả về kho" },
            { key: "DIEU_CHUYEN", label: "Điều chuyển bộ ↔ bộ" },
            { key: "LOAI_BIEN", label: "Loại biên hao mòn" },
            { key: "SU_CO", label: "Hỏng / Mất" },
          ].map((pill) => {
            const active = filterType === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilterType(pill.key)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  active
                    ? "bg-[var(--primary)] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <ResponsiveTableShell
        mobileCards={
          loading ? (
            <div className="p-6 text-center text-xs text-slate-500">Đang tải nhật ký...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Chưa có giao dịch vòng đời hoặc điều chuyển nào.</div>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => (
                <li key={item.id} className="p-3.5 space-y-1.5 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        VARIANT_STYLES[item.badge_variant]
                      }`}
                    >
                      {item.badge_label}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${
                        item.so_luong_thay_doi > 0 ? "text-emerald-600" : "text-slate-800"
                      }`}
                    >
                      {item.so_luong_thay_doi > 0 ? `+${item.so_luong_thay_doi}` : item.so_luong_thay_doi}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{item.ten_loai}</p>
                    <p className="text-[11px] text-slate-500">Mã: {item.ma_loai}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                    <span>{item.ten_bo ? `${item.ma_bo || ""}: ${item.ten_bo}` : "Kho lẻ CSSD"}</span>
                    <span>
                      {new Date(item.created_at).toLocaleString("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {item.ghi_chu ? (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                      {item.ghi_chu}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        }
      >
        <table className="w-full border-collapse text-left text-sm text-slate-700">
          <thead className={L.theadRow}>
            <tr>
              <th className={`${L.th} w-36`}>Thời gian</th>
              <th className={`${L.th} w-44`}>Nghiệp vụ</th>
              <th className={L.th}>Loại dụng cụ</th>
              <th className={L.th}>Bộ / Vị trí</th>
              <th className={`${L.th} w-24 text-center`}>Số lượng</th>
              <th className={L.th}>Ghi chú / Chứng từ</th>
            </tr>
          </thead>
          <tbody className={L.tbody}>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1.5" />
                  Đang tải nhật ký biến động...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                  Chưa có giao dịch vòng đời hoặc điều chuyển nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className={`${L.td} text-xs text-slate-500 tabular-nums`}>
                    {new Date(item.created_at).toLocaleString("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className={L.td}>
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                        VARIANT_STYLES[item.badge_variant]
                      }`}
                    >
                      {item.badge_label}
                    </span>
                  </td>
                  <td className={L.td}>
                    <div className="font-semibold text-slate-800">{item.ten_loai}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{item.ma_loai}</div>
                  </td>
                  <td className={L.td}>
                    {item.ten_bo ? (
                      <div>
                        <span className="font-mono font-bold text-[var(--primary)] text-xs">
                          {item.ma_bo || "—"}
                        </span>{" "}
                        <span className="text-xs text-slate-700">{item.ten_bo}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium italic">Kho lẻ CSSD</span>
                    )}
                  </td>
                  <td className={`${L.td} text-center tabular-nums font-bold`}>
                    <span
                      className={
                        item.so_luong_thay_doi > 0
                          ? "text-emerald-600"
                          : item.so_luong_thay_doi < 0
                            ? "text-slate-800"
                            : "text-slate-400"
                      }
                    >
                      {item.so_luong_thay_doi > 0 ? `+${item.so_luong_thay_doi}` : item.so_luong_thay_doi}
                    </span>
                  </td>
                  <td className={`${L.td} text-xs text-slate-600`}>
                    {item.ghi_chu || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTableShell>
    </div>
  );
}
