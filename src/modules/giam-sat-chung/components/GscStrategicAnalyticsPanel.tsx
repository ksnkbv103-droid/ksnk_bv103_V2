"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle,
  ExternalLink,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { GscComplianceDashboardLayout } from "@/modules/dashboard/components/gsc-compliance/GscComplianceDashboardLayout";
import { getGscComplianceV4Action } from "../actions/gsc-compliance-v4.actions";
import type { DashboardV4Payload } from "@/modules/dashboard/strategic-dashboard-v4.types";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";

type FilterProps = {
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  bangKiemOptions: { id: string; label: string }[];
  selectedBangKiemMas: string[];
  setSelectedBangKiemMas: (v: string[]) => void;
  khoiOptions: { id: string; label: string }[];
  selectedKhoiIds: string[];
  setSelectedKhoiIds: (v: string[]) => void;
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  setSelectedKhoaIds: (v: string[]) => void;
  ngheOptions: { id: string; label: string }[];
  selectedNgheIds: string[];
  setSelectedNgheIds: (v: string[]) => void;
  khuVucOptions: { id: string; label: string }[];
  selectedKhuVucIds: string[];
  setSelectedKhuVucIds: (v: string[]) => void;
  selectedHinhThucIds: string[];
  setSelectedHinhThucIds: (v: string[]) => void;
};

type Props = FilterProps & {
  payload: GscStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  showComplianceV4?: boolean;
};

const EMPTY_V4: DashboardV4Payload = {
  tu_ngay: "",
  den_ngay: "",
  khoa_id: null,
  vung_nguy_co: [],
  top_vi_pham: [],
  summary: { tong_so_phien: 0, ty_le_tuan_thu_chung: 0 },
};

export default function GscStrategicAnalyticsPanel(p: Props) {
  const [v4Payload, setV4Payload] = useState<DashboardV4Payload>(EMPTY_V4);
  const [v4Loading, setV4Loading] = useState(false);
  const [v4Error, setV4Error] = useState<string | null>(null);

  useEffect(() => {
    if (!p.showComplianceV4 || !p.tuNgay || !p.denNgay) return;
    let cancelled = false;
    setV4Loading(true);
    setV4Error(null);
    getGscComplianceV4Action({
      tu_ngay: p.tuNgay,
      den_ngay: p.denNgay,
      khoa_id: p.selectedKhoaIds.length ? p.selectedKhoaIds[0] : null,
    })
      .then((data) => {
        if (!cancelled) setV4Payload(data);
      })
      .catch((err) => {
        if (!cancelled) setV4Error(err instanceof Error ? err.message : "Không tải được v4");
      })
      .finally(() => {
        if (!cancelled) setV4Loading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [p.showComplianceV4, p.tuNgay, p.denNgay, p.selectedKhoaIds]);

  const sortedGap = useMemo(
    () => [...(p.payload?.gap_analysis || [])].sort((a, b) => (b.ty_le_tgs ?? b.ty_le_ksnk ?? 0) - (a.ty_le_tgs ?? a.ty_le_ksnk ?? 0)),
    [p.payload?.gap_analysis],
  );

  return (
    <div className="space-y-6 px-2 pb-8">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
        <AnalyticsFilterBar
          tuNgay={p.tuNgay}
          setTuNgay={p.setTuNgay}
          denNgay={p.denNgay}
          setDenNgay={p.setDenNgay}
          bangKiemOptions={p.bangKiemOptions}
          selectedBangKiemMas={p.selectedBangKiemMas}
          setSelectedBangKiemMas={p.setSelectedBangKiemMas}
          khoiOptions={p.khoiOptions}
          selectedKhoiIds={p.selectedKhoiIds}
          setSelectedKhoiIds={p.setSelectedKhoiIds}
          khoaOptions={p.khoaOptions}
          selectedKhoaIds={p.selectedKhoaIds}
          setSelectedKhoaIds={p.setSelectedKhoaIds}
          ngheOptions={p.ngheOptions}
          selectedNgheIds={p.selectedNgheIds}
          setSelectedNgheIds={p.setSelectedNgheIds}
          khuVucOptions={p.khuVucOptions}
          selectedKhuVucIds={p.selectedKhuVucIds}
          setSelectedKhuVucIds={p.setSelectedKhuVucIds}
          selectedHinhThucIds={p.selectedHinhThucIds}
          setSelectedHinhThucIds={p.setSelectedHinhThucIds}
        />
      </div>

      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Phiên giám sát", value: p.payload?.kpis?.tong_phien ?? 0 },
          { label: "Lượt quan sát", value: p.payload?.kpis?.tong_quan_sat ?? 0 },
          { label: "Đạt", value: p.payload?.kpis?.tong_dat ?? 0 },
          { label: "Tỷ lệ tuân thủ", value: `${p.payload?.kpis?.ty_le_tuan_thu ?? 0}%` },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase text-slate-400">{k.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-800">{p.loading ? "…" : k.value}</p>
          </div>
        ))}
      </div>

      {p.showComplianceV4 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#026f17]" size={18} />
            <h3 className="font-bold text-slate-800">Vùng nguy cơ IPAC · Top vi phạm</h3>
          </div>
          {v4Error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{v4Error}</div>
          ) : null}
          <GscComplianceDashboardLayout payload={v4Payload} loading={v4Loading} />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {p.payload?.dynamic_checklists?.map((bk) => (
          <div key={bk.ma_bk} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="line-clamp-2 text-[10px] font-bold uppercase text-slate-400">{bk.ten_bang_kiem}</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{bk.ty_le_tuan_thu}%</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
            <TrendingUp size={18} className="text-sky-600" /> Xu hướng tuân thủ
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={p.payload?.trendline || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="ty_le_tuan_thu" stroke="#38bdf8" strokeWidth={3} name="Tuân thủ (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
            <AlertTriangle size={18} className="text-red-500" /> Top tiêu chí vi phạm
          </h3>
          <div className="max-h-[260px] space-y-2 overflow-y-auto">
            {p.payload?.top_violations?.length ? (
              p.payload.top_violations.map((v, i) => (
                <div key={v.criterion_id || i} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <p className="font-semibold text-slate-800">{v.ten_tieu_chi}</p>
                  <p className="text-xs text-slate-500">{v.ten_bang_kiem} · {v.ty_le_vi_pham}% lỗi</p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-slate-400">
                <CheckCircle size={40} className="mb-2 text-emerald-200" />
                <p className="text-sm">Không ghi nhận vi phạm</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {sortedGap.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
            <BarChart2 size={18} className="text-indigo-500" /> Đối soát TGS vs KSNK
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedGap} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="ten" width={100} tick={{ fontSize: 10 }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" />
                <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GscAnalyticsDeepLinkHint({ href = "/giam-sat-chung/tuan-thu" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline">
      Xem chi tiết tại module GSC <ExternalLink size={12} />
    </Link>
  );
}
