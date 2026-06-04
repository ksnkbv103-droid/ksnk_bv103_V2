"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  Eye,
  FileBarChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { buildAnalyticsDeepLink } from "@/modules/dashboard/lib/bao-cao-tong-hop-core";
import {
  BAO_CAO_TONG_HOP_THRESHOLDS,
  complianceToneFromPercent,
} from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";

type Props = {
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
};

export function CommandCenterBriefSections({ vstPayload, gscPayload, tuNgay, denNgay, selectedKhoaIds }: Props) {
  const baoCaoHref = buildAnalyticsDeepLink("/bao-cao-tong-hop", {
    tu_ngay: tuNgay,
    den_ngay: denNgay,
    khoa_ids: selectedKhoaIds.length > 0 ? selectedKhoaIds : undefined,
  });

  const tyLeVst = vstPayload?.kpis?.ty_le_tuan_thu ?? null;
  const tyLeGsc = gscPayload?.kpis?.ty_le_tuan_thu ?? null;

  const topGapAlerts = useMemo(() => {
    const rows = [
      ...(vstPayload?.gap_analysis ?? []).map((r) => ({
        domain: "VST" as const,
        ten: r.ten,
        doLech: Math.abs((r.ty_le_tgs ?? 0) - (r.ty_le_ksnk ?? 0)),
      })),
      ...(gscPayload?.gap_analysis ?? []).map((r) => ({
        domain: "GSC" as const,
        ten: r.ten,
        doLech: Math.abs((r.ty_le_tgs ?? 0) - (r.ty_le_ksnk ?? 0)),
      })),
    ];
    return rows.sort((a, b) => b.doLech - a.doLech).slice(0, 3);
  }, [vstPayload?.gap_analysis, gscPayload?.gap_analysis]);

  return (
    <>
      <section className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Báo cáo kỳ</p>
            <p className="mt-1 text-sm text-slate-600">
              Xu hướng, so sánh khoa và in báo cáo gửi BGĐ/HĐ KSNK — dùng trang báo cáo tổng hợp (không in từ đây).
            </p>
          </div>
          <Link
            href={baoCaoHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#026f17] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-md hover:bg-emerald-800"
          >
            <FileBarChart size={16} aria-hidden />
            Mở báo cáo tổng hợp
            <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <BriefCard icon={Activity} label="Khoa Tự giám sát" value={Math.max(vstPayload?.workload?.khoa_tu_giam_sat ?? 0, gscPayload?.workload?.khoa_tu_giam_sat ?? 0)} suffix="khoa" tone="blue" />
        <BriefCard icon={Eye} label="Được KSNK bao phủ" value={Math.max(vstPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0, gscPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0)} suffix="khoa" tone="emerald" />
        <BriefCard icon={ClipboardList} label="Chuyên đề bao phủ" value={gscPayload?.workload?.chuyen_de_duoc_ksnk_phu ?? 0} suffix="BK" tone="purple" />
        <BriefCard icon={Users} label="Phiên KSNK (GSC)" value={gscPayload?.workload?.ksnk_so_phien ?? 0} suffix="phiên" tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrafficLightCard
          title="Vệ sinh tay"
          icon={ShieldCheck}
          percent={tyLeVst}
          detailHref={buildAnalyticsDeepLink("/giam-sat-vst", { tu_ngay: tuNgay, den_ngay: denNgay, khoa_ids: selectedKhoaIds.length ? selectedKhoaIds : undefined }, "analytics")}
        />
        <TrafficLightCard
          title="Giám sát chung"
          icon={ClipboardList}
          percent={tyLeGsc}
          detailHref={buildAnalyticsDeepLink("/giam-sat-chung", {
            tu_ngay: tuNgay,
            den_ngay: denNgay,
            khoa_ids: selectedKhoaIds.length ? selectedKhoaIds : undefined,
          }, "analytics")}
        />
      </div>

      {topGapAlerts.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
            <AlertTriangle size={16} className="text-amber-600" aria-hidden />
            Cảnh báo chênh lệch TGS vs KSNK (top 3)
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Chỉ tóm tắt — biểu đồ gap đầy đủ tại module Thống kê hoặc báo cáo tổng hợp.
          </p>
          <ul className="space-y-2">
            {topGapAlerts.map((row) => (
              <li key={`${row.domain}-${row.ten}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{row.domain}</span>
                  {row.ten}
                </span>
                <span className="font-bold text-amber-800">Δ {Math.round(row.doLech)}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function TrafficLightCard({
  title,
  icon: Icon,
  percent,
  detailHref,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  percent: number | null;
  detailHref: string;
}) {
  const tone = complianceToneFromPercent(percent);
  const toneRing = {
    green: "ring-emerald-200 bg-emerald-50",
    yellow: "ring-amber-200 bg-amber-50",
    red: "ring-red-200 bg-red-50",
    neutral: "ring-slate-200 bg-slate-50",
  }[tone];
  const toneText = {
    green: "text-emerald-700",
    yellow: "text-amber-700",
    red: "text-red-700",
    neutral: "text-slate-500",
  }[tone];

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 shadow-sm ring-2 ${toneRing}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Icon size={18} className={toneText} aria-hidden />
          {title}
        </h2>
        <span className={`text-[10px] font-bold uppercase ${toneText}`}>
          {tone === "green" ? "Đạt" : tone === "yellow" ? "Cận ngưỡng" : tone === "red" ? "Nguy cơ" : "—"}
        </span>
      </div>
      <p className={`mt-3 text-4xl font-black ${toneText}`}>{percent != null ? `${percent}%` : "N/A"}</p>
      <p className="mt-1 text-[10px] text-slate-400">
        Ngưỡng xanh ≥{BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}% · vàng ≥{BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN}%
      </p>
      <Link href={detailHref} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
        Thống kê chuyên sâu <ExternalLink size={12} aria-hidden />
      </Link>
    </div>
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
