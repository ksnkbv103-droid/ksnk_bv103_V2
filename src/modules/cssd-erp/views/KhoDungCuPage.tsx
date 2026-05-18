// src/modules/cssd-erp/views/KhoDungCuPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, List, AlertTriangle, Printer, CalendarClock, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import { fetchCssdKhoDungCuList } from "../actions/cssd-kho-read.actions";
import { useImportExport } from "@/hooks/useImportExport";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import InventoryDashboard from "../components/inventory/InventoryDashboard";
import SetMembersModal from "../components/inventory/SetMembersModal";
import InventoryIssueModal from "../components/inventory/InventoryIssueModal";
import { importCSSDData } from "../actions/cssd.actions";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import RegisterBoLabelFromCatalogPanel from "../components/inventory/register-bo-label-from-catalog-panel";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_DATA_SURFACE } from "../shared/ui/cssd-ui-chrome";

/**
 * Trang Giám sát Kho Dụng cụ CSSD (~200 dòng: kho + đăng ký nhãn từ danh mục)
 * Đăng ký nhãn: chọn `dm_bo_dung_cu` → tạo `fact_quy_trinh` có `bo_dung_cu_id` và in QR.
 */
export default function KhoDungCuPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const { printLabel } = usePrint();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "CLEAN" | "PROCESSING" | "BROKEN">("ALL");
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
    tableName: "fact_quy_trinh",
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
    // Lọc theo trạng thái
    if (filterStatus === "CLEAN") filtered = filtered.filter(d => d.trang_thai_hien_tai === 'CAP_PHAT' && !d.is_red_alert);
    else if (filterStatus === "PROCESSING") filtered = filtered.filter(d => ['LAM_SACH', 'QC', 'DONG_GOI', 'TIET_KHUAN'].includes(d.trang_thai_hien_tai));
    else if (filterStatus === "BROKEN") filtered = filtered.filter(d => d.is_red_alert || d.tinh_trang === 'HONG' || d.tinh_trang === 'MAT');
    
    // Lọc FEFO (sắp hết hạn trong 7 ngày)
    if (filterFEFO) {
      filtered = filtered.filter(d => {
        if (!d.han_su_dung || d.trang_thai_hien_tai !== 'CAP_PHAT') return false;
        const daysLeft = (new Date(d.han_su_dung).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return daysLeft <= 7 && daysLeft >= 0;
      });
    }
    return filtered;
  }, [data, filterStatus, filterFEFO]);

  const handleExport = () => {
    const exportData = filteredData.map((d: any) => ({ 
      "MÃ QR": d.ma_vach_qr, "TÊN BỘ": d.dm_bo_dung_cu?.ten_bo, "KHOA": d.dm_bo_dung_cu?.khoa?.ten_khoa || "Dùng chung",
      "SỐ MÓN": d.dm_bo_dung_cu?.so_luong_mon || 1, "FEFO": d.han_su_dung ? new Date(d.han_su_dung).toLocaleDateString('vi-VN') : "---",
      "TRẠNG THÁI": d.trang_thai_hien_tai 
    }));
    exportData.push({ "MÃ QR": "BỆNH VIỆN 103", "TÊN BỘ": "BÁO CÁO KHO FEFO", "KHOA": `Tổng: ${filteredData.length} bộ`, "SỐ MÓN": "", "FEFO": "", "TRẠNG THÁI": "" });
    exportTemplate(exportData);
  };

  const columns: Column<any>[] = [
    { header: "BỘ DỤNG CỤ", accessorKey: "dm_bo_dung_cu.ten_bo", cell: (i: any) => (
      <div className="space-y-1">
        <span className="font-black text-[#026f17] text-[10px] uppercase block">{i.ma_vach_qr}</span>
        <span className="font-bold text-slate-700 text-xs truncate max-w-[200px] block">{i.dm_bo_dung_cu?.ten_bo || 'CHƯA ĐẶT TÊN'}</span>
      </div>
    )},
    { header: "KHOA SỬ DỤNG", accessorKey: "dm_bo_dung_cu.khoa.ten_khoa", cell: (i: any) => <span className="text-[10px] font-bold text-slate-500 uppercase">{i.dm_bo_dung_cu?.khoa?.ten_khoa || 'DÙNG CHUNG'}</span> },
    { header: "SỐ MÓN", accessorKey: "dm_bo_dung_cu.so_luong_mon", cell: (i: any) => <span className="font-black text-slate-600 text-[11px]">{i.dm_bo_dung_cu?.so_luong_mon || 1}</span> },
    { header: "FEFO (HẠN DÙNG)", accessorKey: "han_su_dung", cell: (i: any) => {
      if (!i.han_su_dung) return <span className="text-slate-300">---</span>;
      const daysLeft = (new Date(i.han_su_dung).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      const isDanger = daysLeft <= 7;
      return (
        <span className={`text-[10px] font-black flex items-center gap-1 ${isDanger ? 'text-orange-500' : 'text-emerald-600'}`}>
          {isDanger && <CalendarClock size={12}/>} {new Date(i.han_su_dung).toLocaleDateString('vi-VN')}
        </span>
      );
    }},
    { header: "TRẠNG THÁI", accessorKey: "trang_thai_hien_tai", cell: (i: any) => (
      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${i.is_red_alert ? 'bg-red-50 text-red-600' : i.trang_thai_hien_tai === 'CAP_PHAT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
        {i.is_red_alert ? 'HỎNG/SỰ CỐ' : i.trang_thai_hien_tai.replace(/_/g, ' ')}
      </span>
    )},
    { header: "THAO TÁC", accessorKey: "id", cell: (i: any) => (
      <div className="flex gap-2">
        <button onClick={() => setSelectedSet(i)} className="p-2 bg-slate-50 text-slate-400 hover:text-[#026f17] hover:bg-emerald-50 rounded-lg transition-all" title="Xem chi tiết"><List size={16} /></button>
        <button onClick={() => printLabel({ qrCode: i.ma_vach_qr, tenBoDungCu: i.dm_bo_dung_cu?.ten_bo || 'NA', tram: i.trang_thai_hien_tai, nguoiThucHien: 'CSSD', thoiGian: new Date().toLocaleString('vi-VN') })} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="In nhãn QR"><Printer size={16} /></button>
        <button onClick={() => setIssueTool(i)} className="p-2 bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all" title="Báo sự cố"><AlertTriangle size={16} /></button>
      </div>
    )}
  ];

  const mainContent = (
    <div className="space-y-6">
      <RegisterBoLabelFromCatalogPanel />
      
      <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
        <InventoryDashboard data={data} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {(['ALL', 'CLEAN', 'PROCESSING', 'BROKEN'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase transition-all ${filterStatus === f ? 'bg-white text-[#026f17] shadow-sm' : 'text-slate-400'}`}>
                {f === 'ALL' ? 'Tất cả' : f === 'CLEAN' ? 'Sạch' : f === 'PROCESSING' ? 'Đang xử lý' : 'Sự cố/Hỏng'}
              </button>
            ))}
          </div>
          <button onClick={() => setFilterFEFO(!filterFEFO)} className={`px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase transition-all flex items-center gap-2 border-2 ${filterFEFO ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
            <CalendarClock size={14} /> Sắp hết hạn
          </button>
        </div>

        <div className={CSSD_UI_DATA_SURFACE}>
          <AdvancedDataTable columns={columns} data={filteredData} loading={loading} enableMultiSelect={false} searchPlaceholder="Tìm kiếm bộ dụng cụ, mã QR..." />
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
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && void handleFileUpload(e.target.files[0])} />
          <button type="button" onClick={triggerImport} disabled={isImporting} className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50">
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

