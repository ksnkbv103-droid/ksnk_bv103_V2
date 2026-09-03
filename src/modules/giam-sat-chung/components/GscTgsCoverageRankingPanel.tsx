"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import {
  getTgsCoverageRankingAction,
  type TgsCoverageRankingPayload,
} from "@/lib/analytics/tgs-coverage-ranking.actions";
import { buildQlcvAnalyticsDeepLink } from "@/lib/analytics/qlcv-analytics-deep-link";
import { TGS_BK_CELL_LABELS } from "@/lib/analytics/tgs-coverage-mappers";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type Props = {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
};

export default function GscTgsCoverageRankingPanel({ tuNgay, denNgay, selectedKhoaIds }: Props) {
  const [data, setData] = useState<TgsCoverageRankingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTgsCoverageRankingAction({
        tu_ngay: tuNgay,
        den_ngay: denNgay,
        khoa_ids: selectedKhoaIds.length > 0 ? selectedKhoaIds : undefined,
      });
      if (!res.success) {
        setError(res.error);
        setData(null);
        return;
      }
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [tuNgay, denNgay, selectedKhoaIds]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={`p-4 sm:p-5 space-y-3 ${bv103LayoutChrome.panelSurface}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`${UI.panelTitle} inline-flex items-center gap-2`}>
            <ClipboardCheck className="h-5 w-5 text-[var(--primary)]" aria-hidden />
            Bao phủ tự giám sát theo khoa
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Cập nhật
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      {data ? (
        <p className="text-[11px] text-slate-500">
          {data.rows.length} khoa có nghĩa vụ tự giám sát · {data.so_khoa_khong_ap_dung} khoa{" "}
          {TGS_BK_CELL_LABELS.khong_ap_dung.toLowerCase()} (không có BK bắt buộc trong phạm vi)
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`border-b border-slate-100 ${UI.innerTableHead}`}>
              <th className="py-2 pr-3">Khoa</th>
              <th className="py-2 pr-3">Bao phủ %</th>
              <th className="py-2 pr-3">Đã / Bắt buộc</th>
              <th className="py-2 pr-3">BK thiếu</th>
              <th className="py-2">Tạo việc</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                  Đang tính bao phủ…
                </td>
              </tr>
            ) : null}
            {data?.rows.map((row) => {
              const qlcvHref = buildQlcvAnalyticsDeepLink({
                topic: `Bao phủ tự giám sát · ${row.label}`,
                gap: row.so_bk_thieu > 0 ? TGS_BK_CELL_LABELS.thieu_tgs : "Đủ bao phủ",
                khoaLabel: row.label,
                bkLabel: row.bk_thieu_labels.slice(0, 3).join(", ") || undefined,
              });
              return (
                <tr key={row.id} className="border-b border-slate-50 align-top">
                  <td className="py-3 pr-3 font-semibold text-slate-800" title={row.ten}>
                    {row.label}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`font-bold tabular-nums ${
                        row.ty_le_bao_phu_tgs < 80 ? "text-amber-800" : "text-emerald-800"
                      }`}
                    >
                      {row.ty_le_bao_phu_tgs}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-600 tabular-nums">
                    {row.so_bk_da_tgs}/{row.so_bk_bat_buoc}
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600 max-w-[220px]">
                    {row.so_bk_thieu > 0 ? (
                      <span title={row.bk_thieu_labels.join(", ")}>
                        {row.bk_thieu_labels.slice(0, 4).join(", ")}
                        {row.bk_thieu_labels.length > 4 ? ` (+${row.bk_thieu_labels.length - 4})` : ""}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">{TGS_BK_CELL_LABELS.da_tgs}</span>
                    )}
                  </td>
                  <td className="py-3">
                    {row.so_bk_thieu > 0 ? (
                      <Link
                        href={qlcvHref}
                        className="inline-flex items-center gap-1 bv103-type-label font-semibold text-[var(--primary)] hover:underline"
                      >
                        Tạo việc <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {data && data.rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                  Không có khoa nào có bảng kiểm bắt buộc tự giám sát trong phạm vi lọc (hoặc chưa cấu hình áp dụng trên danh mục).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
