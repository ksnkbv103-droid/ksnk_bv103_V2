"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { resolveTopInterventionChecklists } from "@/lib/analytics/gsc-checklist-intervention";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import { buildGscAnalyticsDeepLink } from "@/modules/giam-sat-chung/components/GscStrategicAnalyticsPanel";
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
      <div className="overflow-x-auto rounded-xl border border-slate-200">
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
      </div>
    </div>
  );
}
