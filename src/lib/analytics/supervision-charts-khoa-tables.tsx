"use client";

import { useMemo } from "react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import type { GapKhoaRow, GapKhoaSortMetric, GapKhoaSortOrder } from "@/lib/analytics/supervision-matrix-mappers";
import {
  countKsnkCoveredKhoa,
  countTgsCoveredKhoa,
  KHOA_COMPLIANCE_WARN_PCT,
} from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import {
  formatGapPctWithDatTong,
  gapCompareStatus,
  gapPctTone,
  GapSortToolbar,
  momentRowBg,
  momentToneClass,
  useSortedGapRows,
} from "@/lib/analytics/supervision-charts-shared";

/** @deprecated Dùng SupervisionKhoaComplianceChart — bảng thay biểu đồ, không dùng trên analytics web. */
export function SupervisionKhoaComplianceTable({
  rows,
  loading,
  moduleLabel,
  sortMetric = "ty_le_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sorted = useSortedGapRows(rows, undefined, sortMetric, sortOrder);
  if (!loading && sorted.length === 0) return null;

  const title = moduleLabel ? `Tỷ lệ tuân thủ · ${moduleLabel}` : "Tỷ lệ tuân thủ theo khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold text-slate-800">{title}</h3>
      <GapSortToolbar
        sortMetric={sortMetric}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        moduleLabel={moduleLabel}
      />
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(420px,55dvh)]">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">KSNK %</th>
              <th className="px-2 py-2 text-center">TGS %</th>
              <th className="px-2 py-2 text-center">Đối soát</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              sorted.map((r, index) => {
                const ksnkTone = gapPctTone(r.ty_le_ksnk);
                const tgsTone = gapPctTone(r.ty_le_tgs);
                const compare = gapCompareStatus(r);
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
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[ksnkTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_ksnk, r.dat_ksnk, r.vol_ksnk)}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[tgsTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_tgs, r.dat_tgs, r.vol_tgs)}
                    </td>
                    <td className={`px-2 py-2 text-center text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                      {compare.label}
                    </td>
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

/** @deprecated Dùng SupervisionKhoaVolumeChart — bảng thay biểu đồ, không dùng trên analytics web. */
export function SupervisionKhoaCountsTable({
  rows,
  loading,
  moduleLabel,
  tgsVolumeLabel = "TGS",
  ksnkVolumeLabel = "KSNK",
  sortMetric = "vol_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  tgsVolumeLabel?: string;
  ksnkVolumeLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sorted = useSortedGapRows(rows, undefined, sortMetric, sortOrder);
  if (!loading && sorted.length === 0) return null;

  const { covered: tgsCovered, total } = countTgsCoveredKhoa(rows);
  const { covered: ksnkCovered } = countKsnkCoveredKhoa(rows);
  const title = moduleLabel ? `Khối lượng giám sát · ${moduleLabel}` : "Khối lượng giám sát theo khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-[11px] font-medium text-slate-600">
          {loading ? "…" : (
            <>
              <span className="font-bold text-sky-700">{ksnkCovered}</span>/{total} KSNK ·{" "}
              <span className="font-bold text-amber-700">{tgsCovered}</span>/{total} TGS
            </>
          )}
        </p>
      </div>
      <GapSortToolbar
        sortMetric={sortMetric}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        moduleLabel={moduleLabel}
      />
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(420px,55dvh)]">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">{ksnkVolumeLabel}</th>
              <th className="px-2 py-2 text-center">{tgsVolumeLabel}</th>
              <th className="px-2 py-2 text-center">Đối soát</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              sorted.map((r, index) => {
                const compare = gapCompareStatus(r);
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 tabular-nums text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-800" title={r.ten}>
                      {r.label}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_ksnk > 0 ? (
                        <span className="font-semibold text-sky-800">
                          {r.dat_ksnk.toLocaleString()}/{r.vol_ksnk.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_tgs > 0 ? (
                        <span className="font-semibold text-amber-800">
                          {r.dat_tgs.toLocaleString()}/{r.vol_tgs.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className={`px-2 py-2 text-center text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                      {compare.label}
                    </td>
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
