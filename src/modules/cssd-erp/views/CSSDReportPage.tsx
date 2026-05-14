// src/modules/cssd-erp/views/CSSDReportPage.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useModulePermission } from "@/hooks/useModulePermission";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useImportExport } from "@/hooks/useImportExport";
import ReportFilters from "../components/report/ReportFilters";
import ReportDashboard from "../components/report/ReportDashboard";
import CSSDPageShell from "../components/layout/cssd-page-shell";

const ReportCharts = dynamic(() => import("../components/report/ReportCharts"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />,
});

const STATIONS = ['TIEP_NHAN', 'LAM_SACH', 'QC', 'DONG_GOI', 'TIET_KHUAN', 'CAP_PHAT'];

/**
 * Trang Báo cáo Phân tích CSSD - Hoàn thiện (≤ 180 dòng)
 * Dashboard KPI, Cảnh báo đỏ tự động và Export template chuẩn lãnh đạo.
 */
export default function CSSDReportPage() {
  const { isAdmin } = useModulePermission("CSSD_REPORT");
  const { exportTemplate } = useImportExport({
    moduleKey: "CSSD_REPORT",
    tableName: "bao_cao_cssd",
    displayName: "Báo cáo CSSD",
    uniqueKey: "ma_vach_qr",
    columnMapping: { "MÃ QR": "ma_vach_qr", "TRẠM CUỐI": "trang_thai_hien_tai", "SỰ CỐ": "is_red_alert", "NGÀY TẠO": "created_at" },
    onImport: async () => ({ success: true }) // Không dùng import ở đây
  });
  const [filters, setFilters] = useState({ 
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
    to: new Date().toISOString().split('T')[0], 
    station: "ALL" 
  });
  const [raw, setRaw] = useState<{ quyTrinh: any[], suCo: any[] }>({ quyTrinh: [], suCo: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const queryQ = supabase.from("fact_quy_trinh").select("*").eq("is_active", true).gte("created_at", filters.from).lte("created_at", filters.to + "T23:59:59");
      const queryS = supabase.from("fact_su_co").select("*").eq("is_active", true).gte("created_at", filters.from).lte("created_at", filters.to + "T23:59:59");
      const [resQ, resS] = await Promise.all([queryQ, queryS]);
      if (resQ.error) toast.error("Không tải quy trình: " + resQ.error.message);
      if (resS.error) toast.error("Không tải sự cố: " + resS.error.message);
      const quyTrinhRows = (resQ.data || []).map((x: any) => ({
        ...x,
        ma_vach_qr: x.ma_qr_quy_trinh,
        trang_thai_hien_tai: x.ma_trang_thai_hien_tai,
      }));
      const suCoRows = (resS.data || []).map((x: any) => ({
        ...x,
        ma_vach_qr: x.ma_qr_quy_trinh,
        tram_phat_hien: x.ma_tram_phat_hien,
        loai_su_co: x.ma_loai_su_co,
      }));
      setRaw({ quyTrinh: quyTrinhRows, suCo: suCoRows });
      setLoading(false);
    })();
  }, [filters]);

  const { stats, alerts, pieData, barData } = useMemo(() => {
    const bData = STATIONS.map(s => {
      const qCount = raw.quyTrinh.filter(q => q.trang_thai_hien_tai === s).length;
      const sCount = raw.suCo.filter(sc => sc.tram_phat_hien === s).length;
      return { name: s, batches: qCount, incidents: sCount, rate: qCount ? (sCount / qCount) * 100 : 0 };
    });
    const sorted = [...bData].sort((a, b) => a.rate - b.rate);
    const pMap = new Map();
    raw.suCo.forEach(s => pMap.set(s.loai_su_co, (pMap.get(s.loai_su_co) || 0) + 1));

    return {
      stats: {
        total: raw.quyTrinh.length, incidents: raw.suCo.length,
        compliance: raw.quyTrinh.length ? (100 - (raw.suCo.length / raw.quyTrinh.length * 100)).toFixed(1) : "100",
        bestStation: sorted[0]?.name.replace(/_/g, " ") || "N/A",
        worstStation: sorted[sorted.length - 1]?.name.replace(/_/g, " ") || "N/A"
      },
      alerts: bData.filter(b => b.rate > 5).map(b => ({ name: b.name, rate: b.rate.toFixed(1) })),
      pieData: Array.from(pMap).map(([name, value]) => ({ name, value })),
      barData: bData.map((b) => ({ ...b, name: b.name.replace(/_/g, " ") })),
    };
  }, [raw]);

  const handleExport = () => {
    exportTemplate(raw.quyTrinh);
  };

  if (!isAdmin)
    return (
      <CSSDPageShell title="Báo cáo CSSD" subtitle="Khoa KSNK — BV103">
        <div className="rounded-[40px] border border-slate-200 bg-white p-12 text-center text-sm font-black uppercase tracking-widest text-slate-400 shadow-sm">
          Bạn không có quyền xem báo cáo tổng hợp
        </div>
      </CSSDPageShell>
    );

  return (
    <CSSDPageShell
      title={
        <>
          Báo cáo <span className="text-[#026f17]">CSSD</span>
        </>
      }
      subtitle="BỆNH VIỆN QUÂN Y 103 — KHOA KSNK"
      actions={
        <>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#026f17]/25 px-6 text-[10px] font-black uppercase tracking-widest text-[#026f17] transition-all hover:bg-white sm:h-16 lg:flex-none"
          >
            <Printer size={20} /> In
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#026f17] px-8 text-[10px] font-black uppercase tracking-widest text-[#FFD700] shadow-xl transition-all active:scale-95 sm:h-16 lg:flex-none"
          >
            <Download size={20} /> Xuất Excel
          </button>
        </>
      }
    >
      <ReportDashboard stats={stats} alerts={alerts} />
      <ReportFilters filters={filters} setFilters={setFilters} stations={STATIONS} />
      <ReportCharts pieData={pieData} barData={barData} />

      <div className="overflow-hidden rounded-[48px] border border-slate-100 bg-white p-2 shadow-sm print:hidden">
        <div className="flex items-center justify-between px-6 pb-2 pt-6 sm:px-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Nhật ký quy trình (kỳ lọc)</h3>
        </div>
        <AdvancedDataTable
          columns={[
            { header: "MÃ QR", accessorKey: "ma_vach_qr", cell: (v: any) => <span className="font-black text-[#026f17]">{v.ma_vach_qr}</span> },
            {
              header: "TRẠM CUỐI",
              accessorKey: "trang_thai_hien_tai",
              cell: (v: any) => (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-bold uppercase text-slate-600">
                  {v.trang_thai_hien_tai?.replace(/_/g, " ")}
                </span>
              ),
            },
            {
              header: "CẢNH BÁO",
              accessorKey: "is_red_alert",
              cell: (v: any) =>
                v.is_red_alert ? (
                  <span className="font-black text-red-600">Cảnh báo đỏ</span>
                ) : (
                  <span className="text-[9px] font-bold uppercase text-emerald-600">Bình thường</span>
                ),
            },
            {
              header: "NGÀY TẠO",
              accessorKey: "created_at",
              cell: (v: any) => <span className="font-bold text-slate-500">{new Date(v.created_at).toLocaleDateString("vi-VN")}</span>,
            },
          ]}
          data={raw.quyTrinh}
          loading={loading}
          enableMultiSelect={false}
        />
      </div>
    </CSSDPageShell>
  );
}
