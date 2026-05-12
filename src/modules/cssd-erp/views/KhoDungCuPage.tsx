// src/modules/cssd-erp/views/KhoDungCuPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, List, AlertTriangle, Printer, CalendarClock, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePrint } from "@/hooks/usePrint";
import { useImportExport } from "@/hooks/useImportExport";
import AdvancedDataTable, { Column } from "@/components/shared/AdvancedDataTable";
import InventoryDashboard from "../components/inventory/InventoryDashboard";
import SetMembersModal from "../components/inventory/SetMembersModal";
import InventoryIssueModal from "../components/inventory/InventoryIssueModal";
import InventoryHistoryTable from "../components/inventory/InventoryHistoryTable";
import { importCSSDData } from "../actions/cssd.actions";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import RegisterBoLabelFromCatalogPanel from "../components/inventory/register-bo-label-from-catalog-panel";
import { getKhoCatalogPayloadAction } from "../actions/cssd-catalog.actions";

/**
 * Trang Giám sát Kho Dụng cụ CSSD (~200 dòng: kho + đăng ký nhãn từ danh mục)
 * Đăng ký nhãn: chọn `dm_bo_dung_cu` → tạo `fact_quy_trinh` có `bo_dung_cu_id` và in QR.
 */
export default function KhoDungCuPage() {
  const { printLabel } = usePrint();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"STOCK" | "HISTORY" | "CATALOG">("STOCK");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "CLEAN" | "PROCESSING" | "BROKEN">("ALL");
  const [filterFEFO, setFilterFEFO] = useState<boolean>(false);
  const [selectedSet, setSelectedSet] = useState<any>(null);
  const [issueTool, setIssueTool] = useState<any>(null);
  const [catalog, setCatalog] = useState<{ bo: any[]; chi_tiet: any[]; loai: any[] }>({ bo: [], chi_tiet: [], loai: [] });
  const [catalogSearch, setCatalogSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await supabase
      .from("fact_quy_trinh")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Không tải được kho: " + error.message);
      setData([]);
      setLoading(false);
      return;
    }
    const rows = (res || []) as Array<Record<string, unknown>>;
    const boIds = [...new Set(rows.map((x) => String(x.bo_dung_cu_id || "").trim()).filter(Boolean))];
    let boMap = new Map<string, any>();
    if (boIds.length) {
      const { data: bos, error: boErr } = await supabase
        .from("dm_bo_dung_cu")
        .select("*, khoa:dm_khoa_phong!khoa_su_dung_id(ten_khoa)")
        .in("id", boIds);
      if (boErr) toast.error("Không tải được dữ liệu bộ: " + boErr.message);
      boMap = new Map((bos || []).map((x: any) => [String(x.id), x]));
    }
    const mapped = rows.map((x) => ({
      ...x,
      ma_vach_qr: x.ma_qr_quy_trinh || "",
      trang_thai_hien_tai: x.ma_trang_thai_hien_tai || "",
      dm_bo_dung_cu: x.bo_dung_cu_id ? boMap.get(String(x.bo_dung_cu_id)) || null : null,
    }));
    setData(mapped);
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
    let cancelled = false;
    void (async () => {
      const res = await getKhoCatalogPayloadAction();
      if (cancelled) return;
      if (!res.success) {
        toast.error(res.error || "Không tải được danh mục kho.");
        return;
      }
      setCatalog(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const q = catalogSearch.trim().toLowerCase();
  const boRows = useMemo(
    () =>
      !q
        ? catalog.bo
        : catalog.bo.filter((x) => `${x.ma_bo} ${x.ten_bo}`.toLowerCase().includes(q)),
    [catalog.bo, q],
  );
  const chiTietRows = useMemo(
    () =>
      !q
        ? catalog.chi_tiet
        : catalog.chi_tiet.filter((x) => `${x.ma_chi_tiet} ${x.ten_chi_tiet} ${x.ten_bo || ""} ${x.ten_loai || ""}`.toLowerCase().includes(q)),
    [catalog.chi_tiet, q],
  );
  const loaiRows = useMemo(
    () =>
      !q
        ? catalog.loai
        : catalog.loai.filter((x) => `${x.ma_loai_dung_cu} ${x.ten_loai_dung_cu}`.toLowerCase().includes(q)),
    [catalog.loai, q],
  );

  function reportIssueFromCatalog(source: "BO" | "CHI_TIET" | "LOAI", row: any) {
    let candidate: any | undefined;
    if (source === "BO") {
      candidate = data.find((x) => String(x.bo_dung_cu_id || "") === String(row.id));
    } else if (source === "CHI_TIET") {
      candidate = data.find((x) => String(x.bo_dung_cu_id || "") === String(row.bo_dung_cu_id || ""));
    } else {
      candidate = data.find((x) => String(x.dm_bo_dung_cu?.loai_dung_cu_id || "") === String(row.id));
    }
    if (!candidate) {
      toast.error("Chưa có bộ tương ứng trong kho có QR. Vui lòng đăng ký nhãn QR cho bộ trước khi báo sự cố.");
      return;
    }
    setIssueTool(candidate);
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
          <button type="button" onClick={triggerImport} disabled={isImporting} className="flex h-14 items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-6 text-[10px] font-black uppercase text-amber-800 shadow-sm transition-all hover:bg-amber-100 disabled:opacity-50">
            {isImporting ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />} Import
          </button>
          <button type="button" onClick={handleExport} className="flex h-14 items-center gap-3 rounded-2xl bg-[#026f17] px-8 text-[10px] font-black uppercase text-[#FFD700] shadow-xl transition-all hover:scale-[1.02] active:scale-95">
            <Download size={20} /> Xuất
          </button>
        </>
      }
    >
      <RegisterBoLabelFromCatalogPanel />
      <div className="flex w-fit gap-2 rounded-2xl border border-slate-100/80 bg-slate-100 p-1">
        <button onClick={() => setMainTab("STOCK")} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${mainTab === 'STOCK' ? 'bg-[#026f17] text-[#FFD700] shadow-md' : 'text-slate-400'}`}>Tổng quan Tồn kho</button> 
        <button onClick={() => setMainTab("HISTORY")} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${mainTab === 'HISTORY' ? 'bg-[#026f17] text-[#FFD700] shadow-md' : 'text-slate-400'}`}>Lịch sử Luân chuyển</button>
        <button onClick={() => setMainTab("CATALOG")} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${mainTab === 'CATALOG' ? 'bg-[#026f17] text-[#FFD700] shadow-md' : 'text-slate-400'}`}>Danh mục dụng cụ</button>
      </div>

      {mainTab === "STOCK" ? (
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

          <div className="bg-white p-2 rounded-[48px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
            <AdvancedDataTable columns={columns} data={filteredData} loading={loading} enableMultiSelect={false} searchPlaceholder="Tìm kiếm bộ dụng cụ, mã QR..." />
          </div>
        </div>
      ) : mainTab === "HISTORY" ? <InventoryHistoryTable /> : (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Tìm nhanh mã/tên bộ, mã/tên chi tiết, mã/tên loại dụng cụ..."
              className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#026f17]/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Danh mục Bộ dụng cụ ({boRows.length})</h3>
              <div className="max-h-[420px] overflow-auto space-y-2">
                {boRows.map((x) => (
                  <div key={x.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[10px] font-black text-slate-400">{x.ma_bo || "—"}</p>
                    <p className="text-sm font-bold text-slate-800">{x.ten_bo || "—"}</p>
                    <button onClick={() => reportIssueFromCatalog("BO", x)} className="mt-2 rounded-lg bg-red-50 px-3 py-1 text-[10px] font-black uppercase text-red-600">Báo sự cố</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Danh mục Dụng cụ chi tiết ({chiTietRows.length})</h3>
              <div className="max-h-[420px] overflow-auto space-y-2">
                {chiTietRows.map((x) => (
                  <div key={x.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[10px] font-black text-slate-400">{x.ma_chi_tiet || "—"}</p>
                    <p className="text-sm font-bold text-slate-800">{x.ten_chi_tiet || "—"}</p>
                    <p className="text-[10px] text-slate-500">{x.ten_bo || "Chưa gán bộ"} · {x.ten_loai || "Chưa gán loại"}</p>
                    <button onClick={() => reportIssueFromCatalog("CHI_TIET", x)} className="mt-2 rounded-lg bg-red-50 px-3 py-1 text-[10px] font-black uppercase text-red-600">Báo sự cố</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <h3 className="mb-3 text-xs font-black uppercase text-[#026f17]">Danh mục Loại dụng cụ ({loaiRows.length})</h3>
              <div className="max-h-[420px] overflow-auto space-y-2">
                {loaiRows.map((x) => (
                  <div key={x.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-[10px] font-black text-slate-400">{x.ma_loai_dung_cu || "—"}</p>
                    <p className="text-sm font-bold text-slate-800">{x.ten_loai_dung_cu || "—"}</p>
                    <button onClick={() => reportIssueFromCatalog("LOAI", x)} className="mt-2 rounded-lg bg-red-50 px-3 py-1 text-[10px] font-black uppercase text-red-600">Báo sự cố</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <InventoryIssueModal isOpen={!!issueTool} onClose={() => setIssueTool(null)} tool={issueTool} onSuccess={fetchData} />
      <SetMembersModal isOpen={!!selectedSet} onClose={() => setSelectedSet(null)} set={selectedSet} />
    </CSSDPageShell>
  );
}

