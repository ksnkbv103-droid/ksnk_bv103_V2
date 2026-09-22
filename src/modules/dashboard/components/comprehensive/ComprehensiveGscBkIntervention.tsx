"use client";

import React, { useMemo } from "react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { resolveTopInterventionChecklists } from "@/lib/analytics/gsc-checklist-intervention";
import { formatPercent1 } from "@/lib/analytics/supervision-percent";
import { gscTyLeFromMatrixCounts } from "@/lib/analytics/supervision-matrix-mappers";
import { rankTopLoi } from "@/lib/domain/bao-cao-pct";
import { buildGscAnalyticsDeepLink } from "@/lib/analytics/supervision-deep-link";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";

type Props = {
  payload: BaoCaoTongHopPayload | null;
};

export function ComprehensiveGscBkIntervention({ payload }: Props) {
  const rows = useMemo(
    () => resolveTopInterventionChecklists(payload?.gsc ?? null, 5),
    [payload?.gsc],
  );
  const topByBk = useMemo(() => {
    const ranked = rankTopLoi(
      (payload?.gsc?.top_violations ?? []).map((v) => ({
        id: v.criterion_id,
        ten: v.ten_tieu_chi,
        ma_bk: v.ma_bk,
        n_loi: v.so_vi_pham,
        n_ap_dung: v.tong_quan_sat,
        ket_qua: "KHONG_DAT" as const,
      })),
    );
    const map = new Map<string, (typeof ranked)[number]>();
    for (const item of ranked) {
      if (item.ma_bk && !map.has(item.ma_bk)) map.set(item.ma_bk, item);
    }
    return map;
  }, [payload?.gsc?.top_violations]);

  const f = payload?.filters;
  const deepBase = f ? { tu_ngay: f.tu_ngay, den_ngay: f.den_ngay, khoa_ids: f.khoa_ids } : undefined;

  if (!payload?.capabilities.topic_gsc || rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">Chưa có dữ liệu GSC theo bảng kiểm trong kỳ lọc.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Top bảng kiểm cần can thiệp — tuân thủ thấp hoặc vi phạm nhiều trong kỳ. Đây là
          báo cáo in; bấm sang thống kê chỉ khi cần phân tích chi tiết khoa.
        </p>
        <Link
          href={deepBase ? buildGscAnalyticsDeepLink(deepBase) : "/thong-ke/gsc"}
          className="inline-flex items-center gap-1 bv103-type-label font-semibold text-emerald-700 hover:underline"
        >
          Chi tiết thống kê <ExternalLink size={10} aria-hidden />
        </Link>
      </div>
      <ResponsiveTableShell unboxed className="rounded-xl border border-slate-200" maxHeight="max-h-[min(360px,50dvh)]">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 bv103-type-label font-semibold text-slate-500">
              <th className="px-3 py-2">BK</th>
              <th className="px-2 py-2 text-right" title="Pool tiêu chí trong BM — không phải % phiên">
                ty_le_bm
              </th>
              <th className="px-2 py-2 text-right">Vi phạm</th>
              <th className="px-2 py-2" title="Không đạt · n_loi rồi ty_le_loi · áp dụng ≥ 5">
                Top lỗi
              </th>
              <th className="px-2 py-2">Khoa yếu</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const loi = topByBk.get(r.ma_bk);
              return (
              <tr key={r.ma_bk} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-800">{r.ma_bk}</p>
                  <p className="max-w-[200px] truncate text-[11px] text-slate-500">{r.ten_bang_kiem}</p>
                </td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-red-700">
                  {formatPercent1(gscTyLeFromMatrixCounts(r) ?? r.ty_le_tuan_thu)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{r.tong_vi_pham}</td>
                <td className="px-2 py-2 text-[11px] text-slate-600">
                  {loi ? `${loi.ten} (${loi.n_loi} · ${loi.ty_le_loi.toFixed(1)}%)` : "—"}
                </td>
                <td className="px-2 py-2 text-[11px] text-slate-600">{r.worst_khoa_ten ?? "—"}</td>
                <td className="px-2 py-2">
                  <Link
                    href={deepBase ? buildGscAnalyticsDeepLink(deepBase, r.ma_bk) : `/thong-ke/gsc?bk=${r.ma_bk}`}
                    className="bv103-type-label font-semibold text-sky-700 hover:underline"
                  >
                    Chi tiết thống kê
                  </Link>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </ResponsiveTableShell>
    </div>
  );
}
