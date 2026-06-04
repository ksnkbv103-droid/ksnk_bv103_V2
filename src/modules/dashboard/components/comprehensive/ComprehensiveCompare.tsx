"use client";

import React, { useMemo } from "react";
import { BarChart2, MapPin } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { topBottomKhoa } from "../../lib/bao-cao-tong-hop-core";

function CompareBarChart({
  data,
  categoryKey,
  vstKey,
  gscKey,
}: {
  data: Record<string, string | number | null>[];
  categoryKey: string;
  vstKey: string;
  gscKey: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey={categoryKey} width={100} tick={{ fontSize: 9 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey={vstKey} name="VST (%)" fill="#10b981" maxBarSize={16} />
        <Bar dataKey={gscKey} name="GSC (%)" fill="#38bdf8" maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComprehensiveCompare({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const { top, bottom } = useMemo(() => topBottomKhoa(payload?.khoa_rank ?? [], 5), [payload?.khoa_rank]);
  const zoneChartData = useMemo(
    () =>
      (payload?.ipac_zone_compare ?? []).filter((r) => r.ty_le_vst != null || r.ty_le_gsc != null),
    [payload?.ipac_zone_compare],
  );

  const hasKhoa = payload?.capabilities.compare_khoa;
  const hasZone = payload?.capabilities.compare_khu_vuc && zoneChartData.length > 0;

  if (!hasKhoa && !hasZone) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
        So sánh theo khoa / vùng IPAC: chưa có dữ liệu trong phạm vi lọc hoặc thiếu quyền VST/GSC.
      </section>
    );
  }

  const khoaChartData = [...top].reverse();

  return (
    <div className="space-y-6">
      {hasZone ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
            <MapPin size={18} className="text-amber-500" aria-hidden />
            So sánh theo vùng IPAC (4 màu)
          </h2>
          <div className="h-[240px]">
            <CompareBarChart
              data={zoneChartData}
              categoryKey="ten"
              vstKey="ty_le_vst"
              gscKey="ty_le_gsc"
            />
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Gộp theo nhóm màu khu vực (Trắng / Đỏ / Vàng / Xanh) — chi tiết từng chức năng phòng ở bảng in.
          </p>
        </section>
      ) : null}

      {hasKhoa ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-800">
            <BarChart2 size={18} className="text-indigo-500" aria-hidden />
            So sánh theo khoa (Top 5)
          </h2>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="h-[280px]">
              <CompareBarChart
                data={khoaChartData}
                categoryKey="ten"
                vstKey="ty_le_vst"
                gscKey="ty_le_gsc"
              />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Cần ưu tiên giám sát (Bottom 5)</h3>
              <ul className="space-y-2">
                {bottom.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-slate-800">{row.ten}</span>
                    <span className="font-black text-red-700">{row.ty_le_avg ?? "—"}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
