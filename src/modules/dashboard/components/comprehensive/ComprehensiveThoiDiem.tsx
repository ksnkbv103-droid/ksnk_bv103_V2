"use client";

import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { KHOA_COMPLIANCE_WARN_PCT } from "@/lib/analytics/supervision-matrix-mappers";

/**
 * Góc thời điểm: VST = 5 thời điểm WHO; GSC = khung hình thức/cách thức nếu có mẫu số.
 * Tự ẩn hàng không có dữ liệu; sắp tuân thủ thấp → cao.
 */
export function ComprehensiveThoiDiem({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const vstMoments = useMemo(() => {
    const rows = payload?.vst?.moments ?? [];
    return [...rows]
      .filter((m) => Number(m.tong_co_hoi ?? 0) > 0)
      .sort((a, b) => a.ty_le_tuan_thu - b.ty_le_tuan_thu);
  }, [payload]);

  const gscSlots = useMemo(() => {
    const rows = [
      ...(payload?.gsc?.matrix_hinh_thuc ?? []).map((r) => ({
        ten: String(r.ten || "Hình thức"),
        tong: Number(r.tong_quan_sat ?? 0),
        dat: Number(r.tong_dat ?? 0),
        ty_le: Number(r.ty_le_tuan_thu ?? 0),
      })),
      ...(payload?.gsc?.matrix_cach_thuc ?? []).map((r) => ({
        ten: String(r.ten || "Cách thức"),
        tong: Number(r.tong_quan_sat ?? 0),
        dat: Number(r.tong_dat ?? 0),
        ty_le: Number(r.ty_le_tuan_thu ?? 0),
      })),
    ]
      .filter((r) => r.tong > 0)
      .sort((a, b) => a.ty_le - b.ty_le);
    return rows;
  }, [payload]);

  if (!payload || (vstMoments.length === 0 && gscSlots.length === 0)) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
        Chưa có dữ liệu theo thời điểm / hình thức trong phạm vi lọc.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className={`mb-1 flex items-center gap-2 ${D.sectionHeading}`}>
        <Clock size={18} className="text-amber-600" aria-hidden />
        Thời điểm & hình thức
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Chỉ hiện nhóm có dữ liệu · sắp tuân thủ thấp → cao · cảnh báo &lt;{KHOA_COMPLIANCE_WARN_PCT}%.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MomentTable
          title="VST — 5 thời điểm WHO"
          rows={vstMoments.map((m) => ({
            ten: m.ten,
            ty_le: m.ty_le_tuan_thu,
            sample: `${m.da_tuan_thu}/${m.tong_co_hoi}`,
          }))}
        />
        <MomentTable
          title="GSC — hình thức / cách thức"
          rows={gscSlots.map((m) => ({
            ten: m.ten,
            ty_le: m.ty_le,
            sample: `${m.dat}/${m.tong}`,
          }))}
        />
      </div>
    </section>
  );
}

function MomentTable({
  title,
  rows,
}: {
  title: string;
  rows: { ten: string; ty_le: number; sample: string }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        {title}: không có dữ liệu.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{title}</div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Nhóm</th>
            <th className="px-3 py-2 text-right">%</th>
            <th className="px-3 py-2 text-right">Mẫu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.ten} className={r.ty_le < KHOA_COMPLIANCE_WARN_PCT ? "bg-amber-50/60" : undefined}>
              <td className="px-3 py-1.5 font-medium text-slate-700">{r.ten}</td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums">{r.ty_le}%</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{r.sample}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
