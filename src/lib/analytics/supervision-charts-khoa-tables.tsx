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

/** Bảng master khoa: khối lượng · % · trạng thái đối soát · CCS (báo cáo tổng hợp). */
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
  const sorted = useSortedGapRows(gapRows, rankRows, "ty_le_ksnk", "desc");

  if (!loading && sorted.length === 0 && !rankRows?.length) return null;

  const title = moduleLabel ? `Bảng tổng hợp khoa · ${moduleLabel}` : "Bảng tổng hợp khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-800">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Khối lượng TGS/KSNK, tỷ lệ tuân thủ (đạt/tổng) và trạng thái đối soát — tô cảnh báo &lt;
        {KHOA_COMPLIANCE_WARN_PCT}%.
      </p>
      <ResponsiveTableShell
        unboxed
        maxHeight="max-h-[min(420px,55dvh)]"
        mobileCards={
          loading ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400">Đang tải…</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((r, index) => {
                const rank = rankById.get(r.id);
                const compare = gapCompareStatus(r);
                const ksnkTone = gapPctTone(r.ty_le_ksnk);
                const tgsTone = gapPctTone(r.ty_le_tgs);
                const ccsTone = rank ? complianceToneFromPercent(rank.ty_le_ccs) : "neutral";
                const rowWarn =
                  (r.ty_le_ksnk != null && r.ty_le_ksnk < KHOA_COMPLIANCE_WARN_PCT) ||
                  (r.ty_le_tgs != null && r.ty_le_tgs < KHOA_COMPLIANCE_WARN_PCT);
                return (
                  <li
                    key={r.id}
                    className={`space-y-1.5 px-3 py-3 ${rowWarn ? momentRowBg[ksnkTone !== "neutral" ? ksnkTone : tgsTone] : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 font-semibold text-slate-800" title={r.ten}>
                        <span className="mr-1.5 tabular-nums text-slate-400">{index + 1}.</span>
                        {r.label}
                      </p>
                      <span className={`shrink-0 text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                        {compare.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <p>
                        TGS:{" "}
                        <span className={`font-semibold tabular-nums ${momentToneClass[tgsTone]}`}>
                          {formatGapPctWithDatTong(r.ty_le_tgs, r.dat_tgs, r.vol_tgs)}
                        </span>
                        <span className="text-slate-400">
                          {" "}
                          ({r.vol_tgs > 0 ? `${r.dat_tgs}/${r.vol_tgs}` : "0"})
                        </span>
                      </p>
                      <p>
                        KSNK:{" "}
                        <span className={`font-semibold tabular-nums ${momentToneClass[ksnkTone]}`}>
                          {formatGapPctWithDatTong(r.ty_le_ksnk, r.dat_ksnk, r.vol_ksnk)}
                        </span>
                        <span className="text-slate-400">
                          {" "}
                          ({r.vol_ksnk > 0 ? `${r.dat_ksnk}/${r.vol_ksnk}` : "0"})
                        </span>
                      </p>
                      {rankRows ? (
                        <p className="col-span-2">
                          CCS:{" "}
                          <span className={`font-semibold tabular-nums ${momentToneClass[ccsTone]}`}>
                            {rank?.has_data === false
                              ? "Chưa GS"
                              : rank?.ty_le_ccs != null
                                ? formatPercent2(rank.ty_le_ccs)
                                : "—"}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        }
      >
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
              {rankRows ? <th className="px-2 py-2 text-center">CCS %</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={rankRows ? 8 : 7} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              sorted.map((r, index) => {
                const rank = rankById.get(r.id);
                const compare = gapCompareStatus(r);
                const ksnkTone = gapPctTone(r.ty_le_ksnk);
                const tgsTone = gapPctTone(r.ty_le_tgs);
                const ccsTone = rank ? complianceToneFromPercent(rank.ty_le_ccs) : "neutral";
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
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums ${momentToneClass[ccsTone]}`}>
                        {rank?.has_data === false ? "Chưa GS" : rank?.ty_le_ccs != null ? formatPercent2(rank.ty_le_ccs) : "—"}
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
