"use client";

import { useState, useEffect } from "react";
import { getGscSessionPrintLabels } from "../actions/giam-sat-chung.actions";
import type { GscPrintLabelPack } from "../lib/gsc-session-labels";

/** Nhãn in từ DB theo FK session (khoa, khu vực, nhân sự…). */
export function useGscDbPrintLabels(params: {
  khoa_id: string;
  khu_vuc_id: string;
  nhan_vien_id: string;
  nghe_nghiep_id: string;
  nguoi_giam_sat_id: string;
}) {
  const [dbPrintLabels, setDbPrintLabels] = useState<GscPrintLabelPack | null>(null);

  useEffect(() => {
    let alive = true;
    setDbPrintLabels(null);
    void getGscSessionPrintLabels({
      khoa_id: params.khoa_id,
      khu_vuc_id: params.khu_vuc_id,
      nhan_vien_id: params.nhan_vien_id,
      nghe_nghiep_id: params.nghe_nghiep_id,
      nguoi_giam_sat_id: params.nguoi_giam_sat_id,
    }).then((r) => {
      if (!alive) return;
      if (r.success) setDbPrintLabels(r.data);
      else setDbPrintLabels(null);
    });
    return () => {
      alive = false;
    };
  }, [
    params.khoa_id,
    params.khu_vuc_id,
    params.nhan_vien_id,
    params.nghe_nghiep_id,
    params.nguoi_giam_sat_id,
  ]);

  return dbPrintLabels;
}
