// src/modules/cssd-erp/views/KhoDungCuPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, List, AlertTriangle, Printer, CalendarClock, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import { fetchCssdKhoDungCuList } from "../actions/cssd-kho-read.actions";
import { useImportExport } from "@/hooks/useImportExport";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import InventoryDashboard, { FilterStatusType } from "../components/inventory/InventoryDashboard";
import SetMembersModal from "../components/inventory/SetMembersModal";
import InventoryIssueModal from "../components/inventory/InventoryIssueModal";
import { importCSSDData } from "../actions/cssd.actions";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_DATA_SURFACE } from "../shared/ui/cssd-ui-chrome";

/**
 * Trang Giám sát Kho Dụng cụ CSSD - BV103
 * Đã lược bỏ panel đăng ký nhãn QR dư thừa, tích hợp click-to-filter theo trạng thái dụng cụ,
 * hiển thị Mã khoa thay vì Tên khoa để tinh gọn giao diện.
 */
export default function KhoDungCuPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const { printLabel } = usePrint();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>("ALL");
  const [filterFEFO, setFilterFEFO] = useState<boolean>(false);
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
    uniqueKey: "ma_qr_quy_trinh",
    columnMapping: {
      "MÃ QR": "ma_qr_quy_trinh",
      "TÊN BỘ": "ten_bo",
      "KHOA": "khoa_su_dung",
      "SỐ MÓN": "so_luong_mon",
      "FEFO": "han_su_dung",
      "TRẠNG THÁI": "ma_trang_thai_hien_tai",
      "MÃ LÔ TK": "lo_tiet_khuan_id",
    },
    onImport: async (rows) => importCSSDData(rows as Record<string, unknown>[]),
    onSuccess: () => { void fetchData(); },
  });

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    const onRefetch = () => void fetchData();
    window.addEventListener("cssd:kho-refetch", onRefetch);
    return () => window.removeEventListener("cssd:kho-refetch", onRefetch);
  }, [fetchData]);

  const filteredData = useMemo(() => {
    let filtered = data;

    // Lọc theo 8 trạng thái click-to-filter
    if (filterStatus === "LAM_SACH") {
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

    // Lọc FEFO (sắp hết hạn trong 7 ngày)
    if (filterFEFO) {
      filtered = filtered.filter(d => {
        if (!d.han_su_dung || d.trang_thai_hien_tai !== "CAP_PHAT") return false;
        const daysLeft = (new Date(d.han_su_dung).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return daysLeft <= 7 && daysLeft >= 0;
      });
    }
    return filtered;
  }, [data, filterStatus, filterFEFO]);

  const handleExport = () => {
    const exportData = filteredData.map((d: any) => ({
      "MÃ QR": d.ma_vach_qr,
      "TÊN BỘ": d.dm_bo_dung_cu?.ten_bo,
      "KHOA": d.dm_bo_dung_cu?.khoa?.ma_khoa || "DÙNG CHUNG",
      "SỐ MÓN": d.dm_bo_dung_cu?.so_luong_mon || 1,
      "FEFO": d.han_su_dung ? new Date(d.han_su_dung).toLocaleDateString("vi-VN") : "---",
      "TRẠNG THÁI": d.trang_thai_hien_tai,
    }));
    exportData.push({
      "MÃ QR": "BỆNH VIỆN 103",
      "TÊN BỘ": "BÁO CÁO KHO FEFO",
      "KHOA": `Tổng: ${filteredData.length} bộ`,
      "SỐ MÓN": "",
      "FEFO": "",
      "TRẠNG THÁI": "",
    });
    exportTemplate(exportData);
  };

  const columns: Column<any>[] = [
    {
      header: "BỘ DỤNG CỤ",
      accessorKey: "dm_bo_dung_cu.ten_bo",
      cell: (i: any) => (
        <div className="space-y-1">
          <span className="font-bold text-slate-800 text-xs truncate max-w-[220px] block">
            {i.dm_bo_dung_cu?.ten_bo || "CHƯA ĐẶT TÊN"}
          </span>
          <span className="font-mono text-[9px] text-slate-400 block">
            {i.ma_vach_qr?.length > 16
              ? `${i.ma_vach_qr.slice(0, 8)}…${i.ma_vach_qr.slice(-4)}`
              : i.ma_vach_qr}
          </span>
        </div>
      ),
    },
    {
      header: "MÃ KHOA",
      accessorKey: "dm_bo_dung_cu.khoa.ma_khoa",
      cell: (i: any) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase">
          {i.dm_bo_dung_cu?.khoa?.ma_khoa || "DÙNG CHUNG"}
        </span>
      ),
    },
    {
      header: "SỐ MÓN",
      accessorKey: "dm_bo_dung_cu.so_luong_mon",
      cell: (i: any) => (
        <span className="font-black text-slate-600 text-[11px]">{i.dm_bo_dung_cu?.so_luong_mon || 1}</span>
      ),
    },
    {
      header: "HẠN SỬ DỤNG",
      accessorKey: "han_su_dung",
      cell: (i: any) => {
        if (!i.han_su_dung) return <span className="text-[10px] text-slate-300 italic">Chưa TK</span>;
        const daysLeft = (new Date(i.han_su_dung).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        const dateStr = new Date(i.han_su_dung).toLocaleDateString("vi-VN");
        if (daysLeft <= 0)
          return (
            <span className="text-[10px] font-black text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
              <CalendarClock size={12} /> HẾT HẠN
            </span>
          );
        if (daysLeft <= 3)
          return (
            <span className="text-[10px] font-black text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
              <CalendarClock size={12} /> {dateStr} ({Math.ceil(daysLeft)}d)
            </span>
          );
        if (daysLeft <= 7)
          return (
            <span className="text-[10px] font-black text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
              <CalendarClock size={12} /> {dateStr} ({Math.ceil(daysLeft)}d)
            </span>
          );
        return <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">{dateStr}</span>;
      },
    },
    {
      header: "ĐANG Ở TRẠM",
      accessorKey: "trang_thai_hien_tai",
      cell: (i: any) => {
        if (i.is_red_alert)
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
              ⚠️ Sự cố
            </span>
          );
        const station = String(i.trang_thai_hien_tai || "");
        const STATION_BADGE: Record<string, { icon: string; label: string; cls: string }> = {
          TIEP_NHAN: { icon: "🕐", label: "Tiếp nhận", cls: "bg-sky-50 text-sky-700 border-sky-100" },
          LAM_SACH: { icon: "🧽", label: "Làm sạch", cls: "bg-teal-50 text-teal-700 border-teal-100" },
          QC: { icon: "🔍", label: "Kiểm tra", cls: "bg-violet-50 text-violet-700 border-violet-100" },
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
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.cls}`}
          >
            {badge.icon} {badge.label}
          </span>
        );
      },
    },
    {
      header: "THAO TÁC",
      accessorKey: "id",
      cell: (i: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSet(i)}
            className="p-2 bg-slate-50 text-slate-400 hover:text-[#026f17] hover:bg-emerald-50 rounded-lg transition-all"
            title="Xem chi tiết"
          >
            <List size={16} />
          </button>
          <button
            onClick={() =>
              printLabel({
                qrCode: i.ma_vach_qr,
                tenBoDungCu: i.dm_bo_dung_cu?.ten_bo || "NA",
                tram: i.trang_thai_hien_tai,
                nguoiThucHien: "CSSD",
                thoiGian: new Date().toLocaleString("vi-VN"),
              })
            }
            className="p-2 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            title="In nhãn QR"
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

  const mainContent = (
    <div className="space-y-6">
      <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
        <InventoryDashboard data={data} activeStatus={filterStatus} onSelectStatus={setFilterStatus} />
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Danh sách lọc: <span className="text-[#026f17] font-black">{filteredData.length}</span> bộ dụng cụ
          </p>
          <button
            onClick={() => setFilterFEFO(!filterFEFO)}
            className={`px-6 py-3 rounded-2xl font-black text-[9px] uppercase transition-all flex items-center gap-2 border-2 ${
              filterFEFO
                ? "border-orange-500 bg-orange-50 text-orange-600"
                : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100/50"
            }`}
          >
            <CalendarClock size={14} /> Chỉ hiển thị Sắp hết hạn (FEFO)
          </button>
        </div>

        <div className={CSSD_UI_DATA_SURFACE}>
          <AdvancedDataTable
            columns={columns}
            data={filteredData}
            loading={loading}
            enableMultiSelect={false}
            searchPlaceholder="Tìm kiếm bộ dụng cụ, mã QR..."
          />
        </div>
      </div>

      <InventoryIssueModal isOpen={!!issueTool} onClose={() => setIssueTool(null)} tool={issueTool} onSuccess={fetchData} />
      <SetMembersModal isOpen={!!selectedSet} onClose={() => setSelectedSet(null)} set={selectedSet} />
    </div>
  );

  if (suppressShell) {
    return mainContent;
  }

  return (
    <CSSDPageShell
      title={
        <>
          Giám sát kho <span className="text-[#026f17]">FEFO</span>
        </>
      }
      subtitle="Dữ liệu đồng bộ từ mẻ tiệt khuẩn & cấp phát"
      actions={
        <>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void handleFileUpload(e.target.files[0])}
          />
          <button
            type="button"
            onClick={triggerImport}
            disabled={isImporting}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />} Import
          </button>
          <button type="button" onClick={handleExport} className={CSSD_UI_ACTION_PRIMARY}>
            <Download size={20} /> Xuất
          </button>
        </>
      }
    >
      {mainContent}
    </CSSDPageShell>
  );
}
