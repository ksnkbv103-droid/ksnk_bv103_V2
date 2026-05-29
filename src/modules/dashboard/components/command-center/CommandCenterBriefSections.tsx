"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  ClipboardList,
  Eye,
  ExternalLink,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { GscAnalyticsDeepLinkHint } from "@/modules/giam-sat-chung/components/GscStrategicAnalyticsPanel";
import { VstAnalyticsDeepLinkHint } from "@/modules/giam-sat-vst/components/VstStrategicAnalyticsPanel";

type Props = {
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
};

export function CommandCenterBriefSections({ vstPayload, gscPayload }: Props) {
  const sortedGapVst = useMemo(
    () =>
      [...(vstPayload?.gap_analysis || [])]
        .sort((a, b) => (b.ty_le_tgs ?? b.ty_le_ksnk ?? 0) - (a.ty_le_tgs ?? a.ty_le_ksnk ?? 0))
        .slice(0, 12),
    [vstPayload?.gap_analysis],
  );
  const sortedGapGsc = useMemo(
    () =>
      [...(gscPayload?.gap_analysis || [])]
        .sort((a, b) => (b.ty_le_tgs ?? b.ty_le_ksnk ?? 0) - (a.ty_le_tgs ?? a.ty_le_ksnk ?? 0))
        .slice(0, 12),
    [gscPayload?.gap_analysis],
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <BriefCard icon={Activity} label="Khoa Tự giám sát" value={Math.max(vstPayload?.workload?.khoa_tu_giam_sat ?? 0, gscPayload?.workload?.khoa_tu_giam_sat ?? 0)} suffix="khoa" tone="blue" />
        <BriefCard icon={Eye} label="Được KSNK bao phủ" value={Math.max(vstPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0, gscPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0)} suffix="khoa" tone="emerald" />
        <BriefCard icon={ClipboardList} label="Chuyên đề bao phủ" value={gscPayload?.workload?.chuyen_de_duoc_ksnk_phu ?? 0} suffix="BK" tone="purple" />
        <BriefCard icon={Users} label="Phiên KSNK (GSC)" value={gscPayload?.workload?.ksnk_so_phien ?? 0} suffix="phiên" tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
                <ShieldCheck className="text-emerald-600" size={20} /> Vệ sinh tay (WHO)
              </h2>
              <p className="mt-1 text-xs text-slate-500">Tóm tắt — chi tiết tại module VST</p>
            </div>
            <VstAnalyticsDeepLinkHint />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiTile label="Tuân thủ" value={`${vstPayload?.kpis?.ty_le_tuan_thu ?? 0}%`} accent="emerald" />
            <KpiTile label="Cơ hội" value={String(vstPayload?.kpis?.tong_co_hoi ?? 0)} />
            <KpiTile label="Đúng KT" value={`${vstPayload?.kpis?.ty_le_dung_ky_thuat ?? 0}%`} />
            <KpiTile label="Lạm dụng găng" value={`${vstPayload?.kpis?.ty_le_lam_dung_gang ?? 0}%`} accent="red" />
          </div>
          <Link
            href="/giam-sat-vst"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Mở thống kê VST <ExternalLink size={12} />
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
                <ClipboardList className="text-sky-600" size={20} /> Giám sát chung
              </h2>
              <p className="mt-1 text-xs text-slate-500">Tóm tắt — chi tiết tại module GSC</p>
            </div>
            <GscAnalyticsDeepLinkHint />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiTile label="Tuân thủ" value={`${gscPayload?.kpis?.ty_le_tuan_thu ?? 0}%`} accent="sky" />
            <KpiTile label="Phiên" value={String(gscPayload?.kpis?.tong_phien ?? 0)} />
            <KpiTile label="Quan sát" value={String(gscPayload?.kpis?.tong_quan_sat ?? 0)} />
            <KpiTile label="Vi phạm" value={String(gscPayload?.kpis?.tong_vi_pham ?? 0)} accent="red" />
          </div>
          <Link
            href="/giam-sat-chung/tuan-thu"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100"
          >
            Mở thống kê GSC <ExternalLink size={12} />
          </Link>
        </section>
      </div>

      {(sortedGapVst.length > 0 || sortedGapGsc.length > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-800">
            <BarChart2 className="text-indigo-500" size={20} /> Đối soát TGS vs KSNK (Gap)
          </h2>
          <p className="mb-6 text-xs text-slate-500">Insight cross-domain — top 12 khoa chênh lệch lớn nhất</p>
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            {sortedGapVst.length > 0 ? (
              <GapMiniChart title="Vệ sinh tay" data={sortedGapVst} ksnkColor="#10b981" />
            ) : null}
            {sortedGapGsc.length > 0 ? (
              <GapMiniChart title="Giám sát chung" data={sortedGapGsc} ksnkColor="#38bdf8" />
            ) : null}
          </div>
        </section>
      )}
    </>
  );
}

function BriefCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  suffix: string;
  tone: "blue" | "emerald" | "purple" | "orange";
}) {
  const bg = { blue: "bg-blue-500", emerald: "bg-emerald-500", purple: "bg-purple-500", orange: "bg-orange-500" }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 text-white ${bg}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-900">
            {value} <span className="text-xs font-semibold text-slate-400">{suffix}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "sky" | "red" }) {
  const color = accent === "emerald" ? "text-emerald-600" : accent === "sky" ? "text-sky-600" : accent === "red" ? "text-red-600" : "text-slate-800";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function GapMiniChart({
  title,
  data,
  ksnkColor,
}: {
  title: string;
  data: { ten: string; ty_le_tgs: number | null; ty_le_ksnk: number | null }[];
  ksnkColor: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-slate-700">{title}</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <RechartsTooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" maxBarSize={28} />
            <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill={ksnkColor} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CommandCenterKsnkStaffSection({
  rows,
  loading,
  onExpand,
}: {
  rows: { id: string; ho_ten: string; ma_nv: string; so_co_hoi_vst: number; so_phien_vst: number; so_phien_gsc: number }[];
  loading: boolean;
  onExpand: () => void;
}) {
  if (rows.length === 0 && !loading) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={onExpand}
          className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          <Users size={18} /> Tải bảng hoạt động nhân viên KSNK
        </button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
        <Users className="text-indigo-600" size={20} />
        <div>
          <h3 className="font-bold text-slate-800">Hoạt động Nhân viên KSNK</h3>
          <p className="text-xs text-slate-500">Tải theo yêu cầu — không chặn KPI tóm tắt</p>
        </div>
        {loading ? <span className="text-xs text-slate-400">Đang tải…</span> : null}
      </div>
      {rows.length > 0 ? (
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left">Nhân viên</th>
                <th className="px-4 py-3 text-right">Cơ hội VST</th>
                <th className="px-4 py-3 text-right">Phiên VST</th>
                <th className="px-4 py-3 text-right">Phiên GSC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...rows]
                .sort((a, b) => b.so_phien_vst + b.so_phien_gsc - (a.so_phien_vst + a.so_phien_gsc))
                .map((nv) => (
                  <tr key={nv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5">
                      <p className="font-semibold text-slate-700">{nv.ho_ten}</p>
                      <p className="text-xs text-slate-400">{nv.ma_nv}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">{nv.so_co_hoi_vst.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{nv.so_phien_vst.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{nv.so_phien_gsc.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
          <AlertTriangle size={16} /> Không có dữ liệu hoặc bạn không có quyền xem.
        </div>
      )}
    </section>
  );
}
