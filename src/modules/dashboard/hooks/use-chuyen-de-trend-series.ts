"use client";

import { useEffect, useState } from "react";
import { getGscChecklistDetail } from "@/modules/giam-sat-chung/actions/gsc-checklist-detail.actions";
import {
  MAX_CHUYEN_DE_TREND_LINES,
  toChuyenDeTrendSeries,
  type ChuyenDeTrendSeries,
} from "../lib/chuyen-de-trend-series";

type Filters = {
  tu_ngay: string;
  den_ngay: string;
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
};

/**
 * Khi chọn ≥1 BK: tải trendline từng chuyên đề (tối đa 12) cho multi-line chart.
 */
export function useChuyenDeTrendSeries(
  selectedBangKiemMas: string[],
  filters: Filters,
  enabled: boolean,
) {
  const [series, setSeries] = useState<ChuyenDeTrendSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(0);

  useEffect(() => {
    if (!enabled || selectedBangKiemMas.length === 0) {
      setSeries([]);
      setTruncated(0);
      return;
    }
    let cancelled = false;
    const mas = selectedBangKiemMas.slice(0, MAX_CHUYEN_DE_TREND_LINES);
    setTruncated(Math.max(0, selectedBangKiemMas.length - mas.length));
    setLoading(true);
    void Promise.all(
      mas.map(async (ma) => {
        const res = await getGscChecklistDetail({ ...filters, ma_bk: ma });
        if (!res.success) return null;
        const weeks = (res.data.trendline ?? []).map((w) => ({
          label: w.label,
          min_date: w.min_date,
          tong_quan_sat: Number(w.tong_quan_sat ?? 0),
          tong_dat: Number(w.tong_dat ?? 0),
          ty_le_tuan_thu: w.ty_le_tuan_thu ?? null,
        }));
        return toChuyenDeTrendSeries(ma, res.data.ten_bang_kiem, weeks);
      }),
    )
      .then((rows) => {
        if (cancelled) return;
        setSeries(rows.filter((r): r is ChuyenDeTrendSeries => r != null && r.weeks.length > 0));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    selectedBangKiemMas.join("|"),
    filters.tu_ngay,
    filters.den_ngay,
    (filters.khoi_ids ?? []).join(","),
    (filters.khoa_ids ?? []).join(","),
    (filters.nghe_nghiep_ids ?? []).join(","),
    (filters.khu_vuc_ids ?? []).join(","),
    (filters.hinh_thuc_ids ?? []).join(","),
  ]);

  return { series, loading, truncated };
}
