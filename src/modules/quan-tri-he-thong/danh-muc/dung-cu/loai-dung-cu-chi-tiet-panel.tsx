"use client";

import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import SearchBar from "@/components/shared/SearchBar";
import React, { useEffect, useState } from "react";
import { Layers, Loader2, RefreshCcw, History, Box, ChevronUp, ChevronDown } from "lucide-react";
import { useDataTable } from "@/hooks/useDataTable";
import { toast } from "sonner";
import { getDungCuGiaoDichLogsAction, type DungCuGiaoDichRow } from "../actions/kho-dung-cu-giao-dich.actions";
import { getLoaiDungCuContainingBosAction } from "../actions/loai-dung-cu.actions";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import Link from "next/link";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

type Props = {
  selectedLoaiId: string | null;
  selectedTenLoai?: string | null;
  selectedMaLoai?: string | null;
  boDungCuChua: { id: string; ma_bo: string | null; ten_bo: string | null }[];
};

export function LoaiDungCuChiTietPanel({
  selectedLoaiId,
  selectedTenLoai,
  selectedMaLoai,
  boDungCuChua,
}: Props) {
  const [activeTab, setActiveTab] = useState<"sets" | "logs">("sets");
  const [logs, setLogs] = useState<DungCuGiaoDichRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sets, setSets] = useState(boDungCuChua);
  const [loadingSets, setLoadingSets] = useState(false);
  const {
    processedData: visibleSets,
    searchTerm: setsSearch,
    handleSearch: handleSetsSearch,
    handleSort: handleSetsSort,
    sortConfig: setsSort,
  } = useDataTable(sets, ["ma_bo", "ten_bo"]);
  const {
    processedData: visibleLogs,
    searchTerm: logsSearch,
    handleSearch: handleLogsSearch,
    handleSort: handleLogsSort,
    sortConfig: logsSort,
  } = useDataTable(logs, [
    "loai_giao_dich",
    "so_luong_thay_doi",
    "ghi_chu",
    "bo_dung_cu.ten_bo",
    "bo_dung_cu.ma_bo",
    "quy_trinh.ma_qr_quy_trinh",
    "created_at",
  ]);

  useEffect(() => {
    if (!selectedLoaiId) {
      setSets([]);
      return;
    }
    let active = true;
    setLoadingSets(true);
    void getLoaiDungCuContainingBosAction(selectedLoaiId).then((r) => {
      if (!active) return;
      setSets(r.success ? r.data : []);
      setLoadingSets(false);
    });
    return () => {
      active = false;
    };
  }, [selectedLoaiId]);

  const fetchLogs = async () => {
    if (!selectedLoaiId) return;
    setLoadingLogs(true);
    const result = await getDungCuGiaoDichLogsAction({ loaiDungCuId: selectedLoaiId });
    if (result.success) {
      setLogs(result.data || []);
    } else {
      toast.error("Không tải được lịch sử biến động: " + result.error);
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (selectedLoaiId && activeTab === "logs") {
      fetchLogs();
    }
  }, [selectedLoaiId, activeTab]);

  if (!selectedLoaiId) {
    return (
      <div className={`${UI.inset} border-dashed p-12 text-center`}>
        <Layers className="mx-auto text-slate-300 mb-3 animate-pulse" size={32} />
        <span className={UI.innerTableHead}>
          Chọn một loại dụng cụ để xem các bộ chứa và lịch sử biến động kho
        </span>
      </div>
    );
  }

  const renderBadge = (type: string) => {
    const tone: Record<string, string> = {
      NHAP_KHO: "border-emerald-100 bg-emerald-50 text-emerald-600",
      BAO_HONG: "border-rose-100 bg-rose-50 text-rose-600",
      BAO_MAT: "border-amber-100 bg-amber-50 text-amber-600",
      BO_SUNG: "border-blue-100 bg-blue-50 text-blue-600",
      DIEU_CHUYEN: "border-purple-100 bg-purple-50 text-purple-600",
    };
    const label: Record<string, string> = {
      NHAP_KHO: "Nhập kho",
      BAO_HONG: "Báo hỏng",
      BAO_MAT: "Báo mất",
      BO_SUNG: "Bổ sung",
      DIEU_CHUYEN: "Điều chuyển",
    };
    const t = tone[type] ?? "border-slate-100 bg-slate-50 text-slate-600";
    return <span className={`${UI.statusBadge} ${t}`}>{label[type] ?? type}</span>;
  };

  return (
    <div className={`${UI.shell} animate-in fade-in duration-500 overflow-hidden`}>
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 md:flex-row md:items-center sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-lg">
              {selectedMaLoai || "LDC"}
            </span>
            <h3 className={UI.panelTitle}>
              {selectedTenLoai || "Chi tiết loại dụng cụ"}
            </h3>
          </div>
          <p className={`${UI.panelSubtitle} mt-1`}>
            Tra cứu ngược cấu trúc phân bổ & lịch sử biến động y tế
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("sets")}
            className={`px-4 py-2 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "sets"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Box size={13} /> Bộ dụng cụ chứa ({sets.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History size={13} /> Lịch sử biến động ({logs.length})
          </button>
        </div>
      </div>

      <div className="bv103-pad-panel !py-3">
        {activeTab === "sets" ? (
          <div>
            {loadingSets ? (
              <div className="p-12 text-center text-slate-400 text-[11px] font-medium">
                Đang tải bộ chứa…
              </div>
            ) : sets.length === 0 ? (
              <div className="space-y-2 py-8 text-center">
                <p className="text-[11px] font-medium text-slate-500">Chưa có bộ nào chứa loại này.</p>
                <Link href={quanTriDungCuHref("bo")} className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                  Mở danh mục bộ
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <SearchBar
                  value={setsSearch}
                  onChange={handleSetsSearch}
                  placeholder="Tìm mã / tên bộ…"
                  className="max-w-md"
                />
              <ResponsiveTableShell unboxed maxHeight="max-h-[min(320px,45dvh)]">
                <table className="w-full text-left border-collapse">
                  <thead className={L.theadRow}>
                    <tr>
                      <th className={`${L.th} cursor-pointer select-none hover:bg-slate-100/70`} onClick={() => handleSetsSort("ma_bo")}>
                        <div className="flex items-center gap-1">Mã bộ
                          <span className="flex flex-col opacity-30">
                            <ChevronUp size={10} className={(setsSort?.key === "ma_bo" && setsSort.direction === "asc") ? "text-[var(--primary)] opacity-100" : ""} />
                            <ChevronDown size={10} className={(setsSort?.key === "ma_bo" && setsSort.direction === "desc") ? "text-[var(--primary)] opacity-100" : ""} />
                          </span>
                        </div>
                      </th>
                      <th className={`${L.th} cursor-pointer select-none hover:bg-slate-100/70`} onClick={() => handleSetsSort("ten_bo")}>
                        <div className="flex items-center gap-1">Tên bộ dụng cụ
                          <span className="flex flex-col opacity-30">
                            <ChevronUp size={10} className={(setsSort?.key === "ten_bo" && setsSort.direction === "asc") ? "text-[var(--primary)] opacity-100" : ""} />
                            <ChevronDown size={10} className={(setsSort?.key === "ten_bo" && setsSort.direction === "desc") ? "text-[var(--primary)] opacity-100" : ""} />
                          </span>
                        </div>
                      </th>
                      <th className={`${L.th} text-right`}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSets.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-[11px] text-slate-500">Không khớp tìm kiếm.</td></tr>
                    ) : null}
                    {visibleSets.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-mono text-[11px] font-medium text-slate-500">{b.ma_bo || "—"}</td>
                        <td className="py-3 text-[11px] font-medium text-[var(--primary)]">{b.ten_bo || "—"}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              toast.info(`Bộ ${b.ten_bo} đang ở trong trang Danh mục Bộ`);
                            }}
                            className="font-mono text-[11px] font-medium text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Xem chi tiết bộ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableShell>
              </div>
            )}
          </div>
        ) : (
          <div>
            {loadingLogs ? (
              <div className="flex items-center justify-center gap-2 p-12 text-[11px] font-medium text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Đang tải lịch sử...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center text-[11px] font-medium text-slate-400">
                <span>Chưa có giao dịch biến động.</span>
                <button
                  onClick={fetchLogs}
                  className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <RefreshCcw size={12} /> Tải lại
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <SearchBar
                  value={logsSearch}
                  onChange={handleLogsSearch}
                  placeholder="Tìm giao dịch, bộ, QR, ghi chú…"
                  className="max-w-md"
                />
              <ResponsiveTableShell unboxed maxHeight="max-h-[min(320px,45dvh)]">
                <table className="w-full text-left border-collapse">
                  <thead className={L.theadRow}>
                    <tr>
                      <th className={`${L.th} cursor-pointer select-none hover:bg-slate-100/70`} onClick={() => handleLogsSort("created_at")}>
                        <div className="flex items-center gap-1">Thời gian
                          <span className="flex flex-col opacity-30">
                            <ChevronUp size={10} className={(logsSort?.key === "created_at" && logsSort.direction === "asc") ? "text-[var(--primary)] opacity-100" : ""} />
                            <ChevronDown size={10} className={(logsSort?.key === "created_at" && logsSort.direction === "desc") ? "text-[var(--primary)] opacity-100" : ""} />
                          </span>
                        </div>
                      </th>
                      <th className={`${L.th} cursor-pointer select-none hover:bg-slate-100/70`} onClick={() => handleLogsSort("loai_giao_dich")}>
                        <div className="flex items-center gap-1">Loại giao dịch
                          <span className="flex flex-col opacity-30">
                            <ChevronUp size={10} className={(logsSort?.key === "loai_giao_dich" && logsSort.direction === "asc") ? "text-[var(--primary)] opacity-100" : ""} />
                            <ChevronDown size={10} className={(logsSort?.key === "loai_giao_dich" && logsSort.direction === "desc") ? "text-[var(--primary)] opacity-100" : ""} />
                          </span>
                        </div>
                      </th>
                      <th className={`${L.th} cursor-pointer select-none hover:bg-slate-100/70`} onClick={() => handleLogsSort("so_luong_thay_doi")}>
                        <div className="flex items-center gap-1">Biến động
                          <span className="flex flex-col opacity-30">
                            <ChevronUp size={10} className={(logsSort?.key === "so_luong_thay_doi" && logsSort.direction === "asc") ? "text-[var(--primary)] opacity-100" : ""} />
                            <ChevronDown size={10} className={(logsSort?.key === "so_luong_thay_doi" && logsSort.direction === "desc") ? "text-[var(--primary)] opacity-100" : ""} />
                          </span>
                        </div>
                      </th>
                      <th className={`${L.th} cursor-pointer select-none hover:bg-slate-100/70`} onClick={() => handleLogsSort("bo_dung_cu.ten_bo")}>
                        <div className="flex items-center gap-1">Bộ liên đới
                          <span className="flex flex-col opacity-30">
                            <ChevronUp size={10} className={(logsSort?.key === "bo_dung_cu.ten_bo" && logsSort.direction === "asc") ? "text-[var(--primary)] opacity-100" : ""} />
                            <ChevronDown size={10} className={(logsSort?.key === "bo_dung_cu.ten_bo" && logsSort.direction === "desc") ? "text-[var(--primary)] opacity-100" : ""} />
                          </span>
                        </div>
                      </th>
                      <th className={L.th}>Mã vạch bộ QR</th>
                      <th className={L.th}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLogs.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-[11px] text-slate-500">Không khớp tìm kiếm.</td></tr>
                    ) : null}
                    {visibleLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 text-[11px] text-[11px] font-medium text-slate-500">
                          {formatDateTimeVi(log.created_at)}
                        </td>
                        <td className="py-3">{renderBadge(log.loai_giao_dich)}</td>
                        <td className={`py-3 text-[11px] font-semibold ${
                          log.so_luong_thay_doi > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {log.so_luong_thay_doi > 0 ? `+${log.so_luong_thay_doi}` : log.so_luong_thay_doi}
                        </td>
                        <td className="py-3 bv103-type-label font-semibold text-slate-600">
                          {log.bo_dung_cu ? log.bo_dung_cu.ten_bo : "—"}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">
                          {log.quy_trinh ? log.quy_trinh.ma_qr_quy_trinh : "—"}
                        </td>
                        <td className="py-3 bv103-type-note">
                          {log.ghi_chu || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableShell>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
