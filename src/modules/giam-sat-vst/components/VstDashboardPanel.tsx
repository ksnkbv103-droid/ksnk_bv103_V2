"use client";

import React, { useMemo } from "react";
import { Activity, BarChart3, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import type { VstDashboardPayload } from "../actions/vst-dashboard.types";
import { deriveKhoaBarRows, deriveMomentWhoRows } from "./vst-dashboard-panel-derive";
import { MomentWhoMergedTable } from "./vst-dashboard-moment-table";
import { VstDashboardQualitySection } from "./vst-dashboard-quality-section";
import {
  KhoaComplianceBarChart,
  RateBarChart,
  VstTrendStyleLineChart,
} from "./vst-dashboard-recharts-blocks";

type Props = {
  payload: VstDashboardPayload | null;
  loading?: boolean;
};

export default function VstDashboardPanel({ payload, loading }: Props) {
  const k = payload?.kpis;
  const error = payload?.error_breakdown;
  const nCaDat = k?.da_tuan_thu ?? 0;
  const nBoSotTong = k?.bo_sot ?? 0;
  const nDungKyThuat = Math.max(0, nCaDat - (error?.loi_ky_thuat ?? 0));
  const nDuThoiGian = Math.max(0, nCaDat - (error?.loi_thoi_gian ?? 0));
  const nLamDungGang = error?.lam_dung_gang ?? 0;
  const tyLeLamDungGangTheoBoSot =
    nBoSotTong > 0 ? Math.round((nLamDungGang * 1000) / nBoSotTong) / 10 : 0;

  const momentTableRows = useMemo(() => deriveMomentWhoRows(payload?.by_moment_table), [payload?.by_moment_table]);
  const khoaBarRows = useMemo(() => deriveKhoaBarRows(payload?.by_khoa), [payload?.by_khoa]);

  const compareTop = {
    doi_tuong: (payload?.by_doi_tuong || []).slice(0, 8),
    khu_vuc: (payload?.by_khu_vuc || []).slice(0, 8),
  };

  const khoiCompareRows = useMemo(() => payload?.by_khoi ?? [], [payload?.by_khoi]);

  return (
    <div className="space-y-6 px-2 pb-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: Activity, label: "Phiên giám sát", value: String(k?.tong_phien ?? 0) },
          { icon: BarChart3, label: "Cơ hội quan sát", value: String(k?.tong_co_hoi ?? 0) },
          { icon: ShieldCheck, label: "Đã tuân thủ", value: String(k?.da_tuan_thu ?? 0), color: "text-emerald-600" },
          { icon: AlertTriangle, label: "Bỏ sót", value: String(k?.bo_sot ?? 0), color: "text-red-500" },
          { icon: TrendingUp, label: "Tỷ lệ tuân thủ", value: `${k?.ty_le_tuan_thu ?? 0}%`, color: "text-[#026f17]" },
        ].map((x) => (
          <div key={x.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase text-slate-500">{x.label}</p>
              <x.icon className={`h-4 w-4 ${x.color || "text-slate-400"}`} />
            </div>
            <p className={`mt-3 text-3xl font-black ${x.color || "text-slate-800"}`}>{loading ? "…" : x.value}</p>
          </div>
        ))}
      </div>

      {payload ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3">
            <h3 className="mb-4 text-sm font-bold uppercase text-slate-800">Xu hướng tỷ lệ tuân thủ</h3>
            <VstTrendStyleLineChart
              data={(payload.trend || []).map((t) => ({ label: t.label, ty_le: Number(t.ty_le) || 0 }))}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3">
            <h3 className="mb-3 text-sm font-bold uppercase text-slate-800">So sánh theo Khoa / Phòng</h3>
            <div className="mb-3 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#026f17]" /> 10 khoa cao nhất
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#dc2626]" /> 10 khoa thấp nhất
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#94a3b8]" /> Khoa còn lại
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#d97706]" /> Giao nhau (ít khoa)
              </span>
            </div>
            <KhoaComplianceBarChart rows={khoaBarRows} />
          </div>

          <VstDashboardQualitySection
            error={error}
            nCaDat={nCaDat}
            nBoSotTong={nBoSotTong}
            nDungKyThuat={nDungKyThuat}
            nDuThoiGian={nDuThoiGian}
            nLamDungGang={nLamDungGang}
            tyLeLamDungGangTheoBoSot={tyLeLamDungGangTheoBoSot}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3 space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-800">5 thời điểm WHO — gộp bỏ sót &amp; tuân thủ</h3>
            <MomentWhoMergedTable rows={momentTableRows} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3">
            <h3 className="mb-4 text-sm font-bold uppercase text-slate-800">So sánh theo Nghề nghiệp</h3>
            <RateBarChart rows={compareTop.doi_tuong} heightPx={280} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3">
            <h3 className="mb-4 text-sm font-bold uppercase text-slate-800">So sánh theo Khối</h3>
            <RateBarChart
              rows={khoiCompareRows}
              heightPx={Math.min(720, Math.max(280, khoiCompareRows.length * 36 + 80))}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1 lg:col-span-3">
            <h3 className="mb-4 text-sm font-bold uppercase text-slate-800">So sánh theo Khu vực giám sát</h3>
            <RateBarChart
              rows={payload.by_khu_vuc ?? []}
              heightPx={Math.min(720, Math.max(280, (payload.by_khu_vuc?.length ?? 0) * 36 + 80))}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
          <Activity className="h-10 w-10 mb-4 opacity-50" />
          <p className="text-sm font-semibold">
            {loading ? "Đang trích xuất dữ liệu phân tích..." : "Chưa có dữ liệu để phân tích trong bộ lọc này."}
          </p>
        </div>
      )}
    </div>
  );
}
