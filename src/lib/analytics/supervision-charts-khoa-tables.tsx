"use client";

import { useMemo } from "react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import type { GapKhoaRow } from "@/lib/analytics/supervision-matrix-mappers";
import { KHOA_COMPLIANCE_WARN_PCT } from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import {
  formatGapPctWithDatTong,
  gapCompareStatus,
  gapPctTone,
  momentRowBg,
  momentToneClass,
  useSortedGapRows,
} from "@/lib/analytics/supervision-charts-shared";

/** Bảng master khoa: khối lượng · % · trạng thái đối soát · VST/GSC (không CCS). */
export function SupervisionKhoaMasterTable({
  gapRows,
  rankRows,
  loading,
  moduleLabel,
}: {
  gapRows: GapKhoaRow[];
  rankRows?: BaoCaoKhoaRankRow[];
  loading?: boolean;
  moduleLabel?: string;
}) {
  const rankById = useMemo(() => new Map((rankRows ?? []).map((r) => [r.id, r])), [rankRows]);
  const sortedRaw = useSortedGapRows(gapRows, rankRows, "ty_le_ksnk", "asc");
  const sorted = useMemo(
    () => sortedRaw.filter((r) => r.vol_tgs + r.vol_ksnk > 0),
    [sortedRaw],
  );

  if (!loading && sorted.length === 0) return null;

  const title = moduleLabel ? `Bảng tổng hợp khoa · ${moduleLabel}` : "Bảng tổng hợp khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-800">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Chỉ khoa có dữ liệu · sắp KSNK % thấp → cao · tô cảnh báo &lt;{KHOA_COMPLIANCE_WARN_PCT}%.
      </p>
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(420px,55dvh)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">TGS vol</th>
              <th className="px-2 py-2 text-center">KSNK vol</th>
              <th className="px-2 py-2 text-center">TGS %</th>
              <th className="px-2 py-2 text-center">KSNK %</th>
              <th className="px-2 py-2 text-center">Đối soát</th>
              {rankRows ? <th className="px-2 py-2 text-center">VST %</th> : null}
              {rankRows ? <th className="px-2 py-2 text-center">GSC %</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={rankRows ? 9 : 7} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              sorted.map((r, index) => {
                const rank = rankById.get(r.id);
                const compare = gapCompareStatus(r);
                const ksnkTone = gapPctTone(r.ty_le_ksnk);
                const tgsTone = gapPctTone(r.ty_le_tgs);
                const vstTone = rank ? complianceToneFromPercent(rank.ty_le_vst) : "neutral";
                const gscTone = rank ? complianceToneFromPercent(rank.ty_le_gsc) : "neutral";
                const rowWarn =
                  (r.ty_le_ksnk != null && r.ty_le_ksnk < KHOA_COMPLIANCE_WARN_PCT) ||
                  (r.ty_le_tgs != null && r.ty_le_tgs < KHOA_COMPLIANCE_WARN_PCT);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 ${rowWarn ? momentRowBg[ksnkTone !== "neutral" ? ksnkTone : tgsTone] : ""}`}
                  >
                    <td className="px-2 py-2 tabular-nums text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-800" title={r.ten}>
                      {r.label}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_tgs > 0 ? `${r.dat_tgs.toLocaleString()}/${r.vol_tgs.toLocaleString()}` : "0"}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_ksnk > 0 ? `${r.dat_ksnk.toLocaleString()}/${r.vol_ksnk.toLocaleString()}` : "0"}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[tgsTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_tgs, r.dat_tgs, r.vol_tgs)}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[ksnkTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_ksnk, r.dat_ksnk, r.vol_ksnk)}
                    </td>
                    <td className={`px-2 py-2 text-center text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                      {compare.label}
                    </td>
                    {rankRows ? (
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums ${momentToneClass[vstTone]}`}>
                        {rank?.ty_le_vst != null ? formatPercent2(rank.ty_le_vst) : "—"}
                      </td>
                    ) : null}
                    {rankRows ? (
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums ${momentToneClass[gscTone]}`}>
                        {rank?.ty_le_gsc != null ? formatPercent2(rank.ty_le_gsc) : "—"}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ResponsiveTableShell>
    </div>
  );
}
