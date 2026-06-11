"use client";

import { ShieldCheck } from "lucide-react";
import {
  khuVucZoneBadgeClass,
  zoneFromKhuVucMa,
} from "@/lib/khu-vuc-giam-sat-ui";
import type { DashboardV4VungNguyCoRow } from "../../strategic-dashboard-v4.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type VungPalette = {
  bg: string;
  text: string;
  border: string;
  badge: string;
  bar: string;
};

const VUNG_PALETTES: Record<string, VungPalette> = {
  TR: { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200", badge: "bg-slate-200 text-slate-800", bar: "bg-slate-700" },
  DO: { bg: "bg-rose-50/50", text: "text-rose-700", border: "border-rose-100", badge: "bg-rose-100 text-rose-800", bar: "bg-rose-500" },
  VA: { bg: "bg-amber-50/50", text: "text-amber-700", border: "border-amber-100", badge: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  XA: { bg: "bg-emerald-50/50", text: "text-emerald-700", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
};

function getVungColor(code: string): VungPalette {
  const zone = zoneFromKhuVucMa(code);
  return VUNG_PALETTES[zone] ?? {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-100",
    badge: "bg-slate-100 text-slate-800",
    bar: "bg-slate-400",
  };
}

type Props = {
  rows: DashboardV4VungNguyCoRow[];
};

/** Dashboard thành phần 1 — tuân thủ theo 4 vùng IPAC. */
export function GscDashboardVungNguyCoPanel({ rows }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className={`${D.sectionHeadingSm} flex items-center gap-2`}>
          <ShieldCheck className="text-[var(--primary)]" size={18} />
          Theo 4 vùng nguy cơ lây nhiễm IPAC
        </h3>
        <p className="text-[11px] text-slate-400 font-medium">Tỷ lệ đạt trung bình theo phân vùng khu vực</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">Chưa có dữ liệu phiên trong kỳ.</p>
        ) : (
          rows.map((v) => {
            const zone = zoneFromKhuVucMa(v.ma_khu_vuc);
            const colors = getVungColor(v.ma_khu_vuc);
            return (
              <div
                key={v.ma_khu_vuc}
                className={`rounded-xl border p-4 ${colors.bg} ${colors.border} flex items-center justify-between gap-4`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${khuVucZoneBadgeClass(zone)}`}>
                      {zone}
                    </span>
                    <h4 className={`text-xs font-bold truncate ${colors.text}`}>{v.ten_khu_vuc}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400">Số phiên: {v.tong_so_phien}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-lg font-semibold tabular-nums ${colors.text}`}>{v.ty_le_trung_binh}%</span>
                  <div className="w-20 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${v.ty_le_trung_binh}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
