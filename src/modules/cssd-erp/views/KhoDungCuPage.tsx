// src/modules/cssd-erp/views/KhoDungCuPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { List, AlertTriangle, Printer, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useCssdPrint } from "../hooks/use-cssd-print";
import CssdPrintPortal from "../components/print/CssdPrintPortal";
import { fetchCssdKhoDungCuList } from "../actions/cssd-kho-read.actions";
import { useImportExport } from "@/hooks/useImportExport";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import QrScanInput from "@/components/shared/QrScanInput";
import InventoryDashboard, { FilterStatusType } from "../components/inventory/InventoryDashboard";
import SetMembersModal from "../components/inventory/SetMembersModal";
import InventoryIssueModal from "../components/inventory/InventoryIssueModal";
import PackConditionSelect from "../components/inventory/PackConditionSelect";
import { importCSSDData } from "../actions/cssd.actions";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import { CSSD_UI_ACTION_PRIMARY } from "../shared/ui/cssd-ui-chrome";
import { normalizeCssdCode } from "../shared/domain/cssd-qr-core";
import { addDaysYmd, formatDateVi, todayYmdInVn } from "@/lib/format-datetime-vi";
import { isLotExpired } from "@/lib/domain/cssd-kho-hoa-chat-fefo";

/**
 * Trang Giám sát Kho Dụng cụ CSSD - BV103
 * Đã lược bỏ panel đăng ký nhãn QR dư thừa, tích hợp click-to-filter theo trạng thái dụng cụ,
 * hiển thị Mã khoa thay vì Tên khoa để tinh gọn giao diện.
 */
export default function KhoDungCuPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const { printState, onPrintCapPhat, isPrinting: isCssdPrinting } = useCssdPrint();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>("ALL");
  const [filterFEFO, setFilterFEFO] = useState<boolean>(false);
  const [lookup, setLookup] = useState("");
  const [selectedSet, setSelectedSet] = useState<any>(null);
  const [issueTool, setIssueTool] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetchCssdKhoDungCuList();
    if (!res.success) {
      toast.error("Không tải được kho: " + res.error);
      setData([]);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  const { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef } = useImportExport({
    moduleKey: "CSSD_KHO_DUNGCU",
    tableName: "cssd_fact_quy_trinh",
    displayName: "Kho Dụng Cụ",
    uniqueKey: "ma_vach_qr",
    /** Fact vận hành — không cho ẩn hàng loạt tem đang chạy. */
    disableSyncFull: true,
    columnMapping: {
      "MÃ QR": "ma_vach_qr",
      "TÊN BỘ": "ten_bo",
      "KHOA": "khoa_su_dung",
      "SỐ MÓN": "so_luong_mon",
      "FEFO": "han_su_dung",
      "TRẠNG THÁI": "trang_thai_hien_tai",
      "MÃ LÔ TK": "lo_tiet_khuan_id",
    },
    onImport: (rows, options) =>
      importCSSDData(rows as Record<string, unknown>[], {
        softDeleteMissing: false,
        dryRun: options?.dryRun,
      }),
    onSuccess: () => { void fetchData(); },
  });

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    const onRefetch = () => void fetchData();
    window.addEventListener("cssd:kho-refetch", onRefetch);
    return () => window.removeEventListener("cssd:kho-refetch", onRefetch);
  }, [fetchData]);

  const applyLookup = useCallback((raw: string) => {
    const typed = raw.trim();
    setLookup(typed);
    if (!typed) return;
    const code = normalizeCssdCode(typed);
    const q = typed.toLowerCase();
    const hit = data.some((d) => {
      const ten = String(d.cssd_dm_bo_dung_cu?.ten_bo || "").toLowerCase();
      const qr = normalizeCssdCode(d.ma_vach_qr);
      const maBo = normalizeCssdCode(d.cssd_dm_bo_dung_cu?.ma_bo);
      const cycle = normalizeCssdCode(d.ma_cycle_qr);
      return ten.includes(q) || qr.includes(code) || maBo.includes(code) || cycle.includes(code);
    });
    if (!hit) toast.error(`Không thấy bộ nào khớp «${typed}»`);
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (filterStatus === "DANG_XU_LY") {
      filtered = filtered.filter((d) =>
        ["LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN"].includes(String(d.trang_thai_hien_tai || "")),
      );
    } else if (filterStatus === "LAM_SACH") {
      filtered = filtered.filter(d => d.trang_thai_hien_tai === "LAM_SACH");
    } else if (filterStatus === "QC") {
      filtered = filtered.filter(d => d.trang_thai_hien_tai === "QC");
    } else if (filterStatus === "DONG_GOI") {
      filtered = filtered.filter(d => d.trang_thai_hien_tai === "DONG_GOI");
    } else if (filterStatus === "TIET_KHUAN") {
      filtered = filtered.filter(d => d.trang_thai_hien_tai === "TIET_KHUAN");
    } else if (filterStatus === "DA_TIET_KHUAN") {
      filtered = filtered.filter(d => d.trang_thai_hien_tai === "CAP_PHAT" && !d.ma_ca_mo_id);
    } else if (filterStatus === "DA_CAP_PHAT") {
      filtered = filtered.filter(d => d.trang_thai_hien_tai === "CAP_PHAT" && d.ma_ca_mo_id);
    } else if (filterStatus === "BROKEN") {
      filtered = filtered.filter(d => d.is_red_alert || d.tinh_trang === "HONG" || d.tinh_trang === "MAT");
    }

    // Lọc FEFO (≤7 ngày theo lịch VN — gồm đã quá hạn)
    if (filterFEFO) {
      const today = todayYmdInVn();
      const horizon = addDaysYmd(today, 7);
      filtered = filtered.filter((d) => {
        if (!d.han_su_dung || d.trang_thai_hien_tai !== "CAP_PHAT") return false;
        const han = String(d.han_su_dung).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(han)) return false;
        return isLotExpired(han, today) || han <= horizon;
      });
    }

    if (lookup) {
      const q = lookup.trim().toLowerCase();
      const code = normalizeCssdCode(lookup);
      filtered = filtered.filter((d) => {
        const ten = String(d.cssd_dm_bo_dung_cu?.ten_bo || "").toLowerCase();
        const qr = normalizeCssdCode(d.ma_vach_qr);
        const maBo = normalizeCssdCode(d.cssd_dm_bo_dung_cu?.ma_bo);
        const cycle = normalizeCssdCode(d.ma_cycle_qr);
        return ten.includes(q) || qr.includes(code) || maBo.includes(code) || cycle.includes(code);
      });
    }
    return filtered;
  }, [data, filterStatus, filterFEFO, lookup]);

  const dashboardScope = useMemo(() => {
    let scoped = data;
    if (filterFEFO) {
      const today = todayYmdInVn();
      const horizon = addDaysYmd(today, 7);
      scoped = scoped.filter((d) => {
        if (!d.han_su_dung || d.trang_thai_hien_tai !== "CAP_PHAT") return false;
        const han = String(d.han_su_dung).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(han)) return false;
        return isLotExpired(han, today) || han <= horizon;
      });
    }
    if (lookup) {
      const q = lookup.trim().toLowerCase();
      const code = normalizeCssdCode(lookup);
      scoped = scoped.filter((d) => {
        const ten = String(d.cssd_dm_bo_dung_cu?.ten_bo || "").toLowerCase();
        const qr = normalizeCssdCode(d.ma_vach_qr);
        const maBo = normalizeCssdCode(d.cssd_dm_bo_dung_cu?.ma_bo);
        const cycle = normalizeCssdCode(d.ma_cycle_qr);
        return ten.includes(q) || qr.includes(code) || maBo.includes(code) || cycle.includes(code);
      });
    }
    return scoped;
  }, [data, filterFEFO, lookup]);

  const handleExport = () => {
    const exportData = filteredData.map((d: any) => ({
      ma_vach_qr: d.ma_vach_qr,
      ten_bo: d.cssd_dm_bo_dung_cu?.ten_bo,
      khoa_su_dung: d.cssd_dm_bo_dung_cu?.khoa?.ma_khoa || "DÙNG CHUNG",
      so_luong_mon: d.cssd_dm_bo_dung_cu?.so_luong_mon || 1,
      han_su_dung: formatDateVi(d.han_su_dung, "---"),
      trang_thai_hien_tai: d.trang_thai_hien_tai,
      lo_tiet_khuan_id: d.lo_tiet_khuan_id || "",
    }));
    exportTemplate(exportData);
  };

  const columns: Column<any>[] = [
    {
      header: "Bộ dụng cụ",
      accessorKey: "cssd_dm_bo_dung_cu.ten_bo",
      cell: (i: any) => (
        <div className="space-y-1">
          <span className="font-bold text-slate-800 text-xs truncate max-w-[220px] block">
            {i.cssd_dm_bo_dung_cu?.ten_bo || "CHƯA ĐẶT TÊN"}
          </span>
          <span className="font-mono text-[11px] text-slate-400 block">
            {i.ma_vach_qr?.length > 16
              ? `${i.ma_vach_qr.slice(0, 8)}…${i.ma_vach_qr.slice(-4)}`
              : i.ma_vach_qr}
          </span>
        </div>
      ),
    },
    {
      header: "Mã khoa",
      accessorKey: "cssd_dm_bo_dung_cu.khoa.ma_khoa",
      cell: (i: any) => (
        <span className="text-[11px] font-medium text-slate-500 font-mono">
          {i.cssd_dm_bo_dung_cu?.khoa?.ma_khoa || "Dùng chung"}
        </span>
      ),
    },
    {
      header: "Số món",
      accessorKey: "so_luong_thuc_te",
      cell: (i: any) => {
        const can = Number(i.so_luong_can);
        const thuc = Number(i.so_luong_thuc_te);
        const thieu = Number(i.so_luong_thieu || 0);
        if (!Number.isFinite(can) || !Number.isFinite(thuc)) {
          return <span className="text-[11px] text-slate-400">—</span>;
        }
        return (
          <span className={`text-[11px] font-semibold tabular-nums ${thieu > 0 ? "text-red-700" : "text-slate-700"}`}>
            {thieu > 0 ? `${thuc}/${can} · thiếu ${thieu}` : `${thuc}/${can}`}
          </span>
        );
      },
    },
    {
      header: "Hạn sử dụng",
      accessorKey: "han_su_dung",
      cell: (i: any) => {
        if (!i.han_su_dung) return <span className="bv103-type-note">Chưa TK</span>;
        const daysLeft = (new Date(i.han_su_dung).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        const dateStr = formatDateVi(i.han_su_dung);
        if (daysLeft <= 0)
          return (
            <span className="text-[11px] font-mono text-[11px] font-medium text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
              <CalendarClock size={12} /> Hết hạn
            </span>
          );
        if (daysLeft <= 3)
          return (
            <span className="text-[11px] font-mono text-[11px] font-medium text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
              <CalendarClock size={12} /> {dateStr} ({Math.ceil(daysLeft)}d)
            </span>
          );
        if (daysLeft <= 7)
          return (
            <span className="text-[11px] font-semibold text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
              <CalendarClock size={12} /> {dateStr} ({Math.ceil(daysLeft)}d)
            </span>
          );
        return <span className="bv103-type-label font-semibold text-emerald-600 flex items-center gap-1">{dateStr}</span>;
      },
    },
    {
      header: "Đang ở trạm",
      accessorKey: "trang_thai_hien_tai",
      cell: (i: any) => {
        if (i.is_red_alert)
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
              ⚠️ Sự cố
            </span>
          );
        const station = String(i.trang_thai_hien_tai || "");
        const STATION_BADGE: Record<string, { icon: string; label: string; cls: string }> = {
          TIEP_NHAN: { icon: "🕐", label: "Tiếp nhận", cls: "bg-sky-50 text-sky-700 border-sky-100" },
          LAM_SACH: { icon: "🧽", label: "Làm sạch", cls: "bg-teal-50 text-teal-700 border-teal-100" },
          QC: { icon: "🔍", label: "QC", cls: "bg-violet-50 text-violet-700 border-violet-100" },
          DONG_GOI: { icon: "📦", label: "Đóng gói", cls: "bg-amber-50 text-amber-700 border-amber-100" },
          TIET_KHUAN: { icon: "🔥", label: "Tiệt khuẩn", cls: "bg-orange-50 text-orange-700 border-orange-100" },
          CAP_PHAT: {
            icon: i.ma_ca_mo_id ? "📦" : "✅",
            label: i.ma_ca_mo_id ? "Đã cấp phát" : "Sẵn sàng",
            cls: i.ma_ca_mo_id ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-emerald-50 text-emerald-700 border-emerald-100",
          },
        };
        const badge = STATION_BADGE[station] || {
          icon: "❓",
          label: station.replace(/_/g, " "),
          cls: "bg-slate-50 text-slate-600 border-slate-100",
        };
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${badge.cls}`}
          >
            {badge.icon} {badge.label}
          </span>
        );
      },
    },
    {
      header: "Tình trạng gói",
      accessorKey: "tinh_trang",
      cell: (i: any) => (
        <PackConditionSelect
          quyTrinhId={String(i.id || "")}
          tinhTrang={i.tinh_trang}
          onSaved={fetchData}
        />
      ),
    },
    {
      header: "Thao tác",
      accessorKey: "id",
      cell: (i: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSet(i)}
            className="p-2 bg-slate-50 text-slate-400 hover:text-[var(--primary)] hover:bg-emerald-50 rounded-lg transition-all"
            title="Xem chi tiết"
          >
            <List size={16} />
          </button>
          <button
            onClick={() =>
              void onPrintCapPhat({ quyTrinhId: String(i.id), nguoiCapPhat: "CSSD — Kho" })
            }
            disabled={isCssdPrinting || i.trang_thai_hien_tai !== "CAP_PHAT" || !i.lo_tiet_khuan_id}
            className="p-2 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40"
            title="In phiếu cấp phát A4 (QR mã mẻ)"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={() => setIssueTool(i)}
            className="p-2 bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all"
            title="Báo sự cố"
          >
            <AlertTriangle size={16} />
          </button>
        </div>
      ),
    },
  ];

  const importExportActions = (
    <ImportExportToolbar
      fileInputRef={fileInputRef}
      isImporting={isImporting}
      onExport={handleExport}
      onImportClick={triggerImport}
      onFileChange={(file) => void handleFileUpload(file)}
      disableSyncFull
      exportClassName={CSSD_UI_ACTION_PRIMARY}
      importClassName="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
    />
  );

  const mainContent = (
    <div className="bv103-stack-page">
      {suppressShell ? (
        <div className="flex justify-end">{importExportActions}</div>
      ) : null}
      <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
        <InventoryDashboard data={dashboardScope} activeStatus={filterStatus} onSelectStatus={setFilterStatus} />
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-slate-500">
            Danh sách lọc: <span className="text-[var(--primary)] font-semibold">{filteredData.length}</span> bộ dụng cụ
            {lookup ? (
              <button
                type="button"
                className="ml-2 text-[var(--primary)] underline-offset-2 hover:underline"
                onClick={() => setLookup("")}
              >
                Xóa lọc ({lookup})
              </button>
            ) : null}
          </p>
          <button
            onClick={() => setFilterFEFO(!filterFEFO)}
            className={`px-6 py-3 rounded-[var(--radius-shell)] font-semibold text-[11px] transition-all flex items-center gap-2 border-2 ${
              filterFEFO
                ? "border-orange-500 bg-orange-50 text-orange-600"
                : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100/50"
            }`}
          >
            <CalendarClock size={14} /> Chỉ hiển thị Sắp hết hạn (FEFO)
          </button>
        </div>

        <div className="space-y-2">
          <div className="max-w-xl">
            <QrScanInput
              value={lookup}
              onChange={setLookup}
              placeholder="Tìm tên, mã hoặc quét QR…"
              cameraTitle="Tìm hoặc quét QR kho"
              onEnter={applyLookup}
              onCameraScan={applyLookup}
            />
          </div>
          <AdvancedDataTable
            columns={columns}
            data={filteredData}
            loading={loading}
            enableMultiSelect={false}
            hideSearch
          />
        </div>
      </div>

      <InventoryIssueModal isOpen={!!issueTool} onClose={() => setIssueTool(null)} tool={issueTool} onSuccess={fetchData} />
      <SetMembersModal isOpen={!!selectedSet} onClose={() => setSelectedSet(null)} set={selectedSet} />
    </div>
  );

  if (suppressShell) {
    return (
      <>
        {mainContent}
        <CssdPrintPortal printState={printState} />
      </>
    );
  }

  return (
    <CSSDPageShell
      title={
        <>
          Giám sát kho <span className="text-[var(--primary)]">FEFO</span>
        </>
      }
      actions={importExportActions}
    >
      {mainContent}
      <CssdPrintPortal printState={printState} />
    </CSSDPageShell>
  );
}
