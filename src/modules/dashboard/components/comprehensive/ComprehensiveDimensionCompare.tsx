"use client";

import React, { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import type { CompareRow } from "@/lib/analytics/supervision-analytics.types";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type DimensionId = "khoi" | "khu_vuc" | "doi_tuong";

const DIMENSIONS: {
  id: DimensionId;
  label: string;
  capability: keyof BaoCaoTongHopPayload["capabilities"];
}[] = [
  { id: "khoi", label: "Khối", capability: "compare_khoi" },
  { id: "khu_vuc", label: "Khu vực", capability: "compare_khu_vuc" },
  { id: "doi_tuong", label: "Đối tượng", capability: "compare_doi_tuong" },
];

/**
 * Sprint 3: so sánh đa chiều (khối / khu vực / đối tượng) — chỉ bật khi nguồn có matrix.
 * Khoa (TGS/KSNK) nằm ở ComprehensiveCompare — không nhân bản.
 */
export function ComprehensiveDimensionCompare({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const available = useMemo(() => {
    if (!payload) return [] as typeof DIMENSIONS;
    return DIMENSIONS.filter((d) => payload.capabilities[d.capability]);
  }, [payload]);

  const [dim, setDim] = useState<DimensionId>("khoi");
  const active = available.some((d) => d.id === dim) ? dim : available[0]?.id;

  const { vstRows, gscRows, naNote } = useMemo(() => {
    if (!payload || !active) {
      return { vstRows: [] as CompareRow[], gscRows: [] as CompareRow[], naNote: null as string | null };
    }
    if (active === "khoi") {
      return {
        vstRows: toCompareRows(payload.vst?.matrix_khoi),
        gscRows: toCompareRows(payload.gsc?.matrix_khoi),
        naNote: null,
      };
    }
    if (active === "khu_vuc") {
      return {
        vstRows: toCompareRows(payload.vst?.matrix_khu_vuc),
        gscRows: toCompareRows(payload.gsc?.matrix_khu_vuc),
        naNote: null,
      };
    }
    const gscNghe = toCompareRows(payload.gsc?.matrix_nghe);
    return {
      vstRows: toCompareRows(payload.vst?.matrix_nghe),
      gscRows: gscNghe,
      naNote:
        gscNghe.length === 0 && (payload.vst?.matrix_nghe?.length ?? 0) > 0
          ? "GSC: N/A — nguồn chưa trả matrix đối tượng trong kỳ lọc."
          : null,
    };
  }, [payload, active]);

  if (!payload || available.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
        Chưa có dữ liệu so sánh theo khối / khu vực / đối tượng trong phạm vi lọc (ưu tiên so sánh khoa ở mục VST/GSC).
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`flex items-center gap-2 ${D.sectionHeading}`}>
            <Layers size={18} className="text-indigo-600" aria-hidden />
            So sánh đa chiều
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Chỉ hiện chiều có dữ liệu nguồn. Không nội suy khi thiếu matrix.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-0.5">
          {available.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDim(d.id)}
              className={`rounded-md px-3 py-1.5 bv103-type-label font-semibold ${
                active === d.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {naNote ? <p className="mb-3 text-xs font-medium text-amber-800">{naNote}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DimensionTable title="VST" rows={vstRows} />
        <DimensionTable title="GSC" rows={gscRows} />
      </div>
    </section>
  );
}

function DimensionTable({ title, rows }: { title: string; rows: CompareRow[] }) {
  /** Chỉ hiện nhóm có mẫu số > 0; sắp tuân thủ thấp → cao. */
  const sorted = [...rows]
    .filter((r) => (r.tong ?? 0) > 0)
    .sort((a, b) => (a.ty_le_tuan_thu ?? 101) - (b.ty_le_tuan_thu ?? 101));

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        {title}: không có nhóm có dữ liệu trên chiều này.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 bv103-type-label font-semibold text-slate-700">
        {title} · thấp → cao
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Nhóm</th>
            <th className="px-3 py-2 text-right font-semibold">%</th>
            <th className="px-3 py-2 text-right font-semibold">Mẫu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.slice(0, 12).map((r) => (
            <tr key={r.ten}>
              <td className="max-w-[12rem] truncate px-3 py-1.5 font-medium text-slate-700" title={r.ten}>
                {r.ten}
              </td>
              <td className="px-3 py-1.5 text-right font-bold tabular-nums text-slate-900">
                {r.ty_le_tuan_thu == null ? "—" : `${r.ty_le_tuan_thu}%`}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                {r.dat != null && r.tong != null ? `${r.dat}/${r.tong}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
