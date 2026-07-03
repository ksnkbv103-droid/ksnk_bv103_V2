"use client";

import { useEffect, useState } from "react";
import { buildAnalyticsFilterPayload } from "@/lib/analytics/filter-helpers";
import { getGscChecklistDetail } from "@/modules/giam-sat-chung/actions/gsc-checklist-detail.actions";
import type { GscChecklistDetailPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

type Args = {
  maBk: string | null;
  tuNgay: string;
  denNgay: string;
  selectedKhoiIds: string[];
  selectedKhoaIds: string[];
  selectedNgheIds: string[];
  selectedKhuVucIds: string[];
  selectedHinhThucIds: string[];
  khoiOptionCount: number;
  khoaOptionCount: number;
  ngheOptionCount: number;
  khuOptionCount: number;
};

export function useGscChecklistDetail(args: Args) {
  const [detail, setDetail] = useState<GscChecklistDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!args.maBk || !args.tuNgay || !args.denNgay) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    const maBk = args.maBk;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const base = buildAnalyticsFilterPayload({
        tuNgay: args.tuNgay,
        denNgay: args.denNgay,
        selectedKhoiIds: args.selectedKhoiIds,
        selectedKhoaIds: args.selectedKhoaIds,
        selectedNgheIds: args.selectedNgheIds,
        selectedKhuVucIds: args.selectedKhuVucIds,
        selectedHinhThucIds: args.selectedHinhThucIds,
        selectedBangKiemMas: [],
        khoiOptionCount: args.khoiOptionCount,
        khoaOptionCount: args.khoaOptionCount,
        ngheOptionCount: args.ngheOptionCount,
        khuOptionCount: args.khuOptionCount,
      });

      const res = await getGscChecklistDetail({ ...base, ma_bk: maBk });
      if (cancelled) return;
      if (res.success) {
        setDetail(res.data);
        setError(null);
      } else {
        setDetail(null);
        setError(res.error);
      }
      setLoading(false);
    })().catch((e) => {
      if (!cancelled) {
        setDetail(null);
        setError(e instanceof Error ? e.message : "Không tải chi tiết bảng kiểm");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    args.maBk,
    args.tuNgay,
    args.denNgay,
    args.selectedKhoiIds.join("|"),
    args.selectedKhoaIds.join("|"),
    args.selectedNgheIds.join("|"),
    args.selectedKhuVucIds.join("|"),
    args.selectedHinhThucIds.join("|"),
    args.khoiOptionCount,
    args.khoaOptionCount,
    args.ngheOptionCount,
    args.khuOptionCount,
  ]);

  return { detail, loading, error };
}
