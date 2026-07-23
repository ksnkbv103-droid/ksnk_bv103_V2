"use client";

import React, { useMemo } from "react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { resolveTopInterventionChecklists } from "@/lib/analytics/gsc-checklist-intervention";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
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
          Top bảng kiểm cần can thiệp — tuân thủ thấp hoặc vi phạm nhiều trong kỳ.
        </p>
        <Link
          href={deepBase ? buildGscAnalyticsDeepLink(deepBase) : "/thong-ke/gsc"}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
        >
          Phân tích đầy đủ <ExternalLink size={10} aria-hidden />
        </Link>
      </div>
      <ResponsiveTableShell
        unboxed
        className="rounded-xl border border-slate-200"
        maxHeight="max-h-[min(360px,50dvh)]"
        mobileCards={
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.ma_bk} className="space-y-1.5 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{r.ma_bk}</p>
                    <p className="truncate text-[11px] text-slate-500">{r.ten_bang_kiem}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-red-700">
                    {formatPercent2(r.ty_le_tuan_thu)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {r.tong_vi_pham} vi phạm
                  {r.top_violation_ten ? ` · ${r.top_violation_ten}` : ""}
                  {r.worst_khoa_ten ? ` · ${r.worst_khoa_ten}` : ""}
                </p>
                <Link
                  href={deepBase ? buildGscAnalyticsDeepLink(deepBase, r.ma_bk) : `/thong-ke/gsc?bk=${r.ma_bk}`}
                  className="inline-flex min-h-11 items-center text-[11px] font-bold text-sky-700 touch-manipulation hover:underline"
                >
                  Chi tiết
                </Link>
              </li>
            ))}
          </ul>
        }
      >
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">BK</th>
              <th className="px-2 py-2 text-right">Tuân thủ</th>
              <th className="px-2 py-2 text-right">Vi phạm</th>
              <th className="px-2 py-2">Lỗi chính</th>
              <th className="px-2 py-2">Khoa yếu</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ma_bk} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-800">{r.ma_bk}</p>
                  <p className="max-w-[200px] truncate text-[11px] text-slate-500">{r.ten_bang_kiem}</p>
                </td>
                <td className="px-2 py-2 text-right font-bold tabular-nums text-red-700">
                  {formatPercent2(r.ty_le_tuan_thu)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{r.tong_vi_pham}</td>
                <td className="px-2 py-2 text-[11px] text-slate-600">{r.top_violation_ten ?? "—"}</td>
                <td className="px-2 py-2 text-[11px] text-slate-600">{r.worst_khoa_ten ?? "—"}</td>
                <td className="px-2 py-2">
                  <Link
                    href={deepBase ? buildGscAnalyticsDeepLink(deepBase, r.ma_bk) : `/thong-ke/gsc?bk=${r.ma_bk}`}
                    className="text-[11px] font-bold text-sky-700 hover:underline"
                  >
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTableShell>
    </div>
  );
}
