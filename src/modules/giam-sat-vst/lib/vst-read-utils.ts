// src/modules/giam-sat-vst/lib/vst-read-utils.ts
import { classifyVstAction } from "./vst-action-classifier";
import { vstSessionDisplayRef } from "./vst-display-ref";

export type VstSessionRow = { id?: string; khoa_id?: string; nguoi_giam_sat_id?: string; [key: string]: unknown };
export type VstObservationLite = { session_id?: string; hanh_dong?: string; [key: string]: unknown };

export function vstReadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export function khuTenFromSessionRow(x: Record<string, unknown>): string {
  const dm = x.dm_khu_vuc_giam_sat as { ten_khu_vuc?: string } | undefined;
  return String(dm?.ten_khu_vuc || "").trim();
}

export type VstObs = { hanh_dong?: string };

export type VstHistoryRow = Record<string, unknown> & {
  id: string;
  ngay_giam_sat?: string;
  observations?: VstObs[];
  danh_muc_khoa?: { ten_danh_muc?: string };
  danh_muc_khu_vuc?: { ten_danh_muc?: string };
  nguoi_giam_sat?: { ho_ten?: string };
  created_at?: string;
  nguoi_giam_sat_id?: string;
  hinh_thuc_giam_sat?: string;
  cach_thuc_giam_sat?: string;
  ma_khoa: string;
  khoa_name: string;
  khu_name: string;
  ng_gs_ten: string;
  ma_hien_thi: string;
  total_opps: number;
  compliance: number;
  date_str: string;
};

export function enrichVstSessionRows(rows: Record<string, unknown>[]): VstHistoryRow[] {
  return rows.map((s) => {
    const obs = (s.observations as VstObs[]) || [];
    const totalFromView = Number(s.tong_co_hoi ?? 0);
    const compliantFromView = Number(s.da_tuan_thu ?? 0);
    const total_opps = Number.isFinite(totalFromView) && totalFromView > 0 ? totalFromView : obs.length;
    const compliant =
      Number.isFinite(compliantFromView) && compliantFromView >= 0
        ? compliantFromView
        : obs.filter((o) => classifyVstAction(o.hanh_dong).isCompliant).length;
    const compliance = total_opps > 0 ? Math.round((compliant / total_opps) * 100) : 0;
    
    const ngayt = s.ngay_giam_sat as string | undefined;
    const dateSrc = ngayt?.trim() 
      ? new Date(`${ngayt}T12:00:00`) 
      : s.created_at ? new Date(String(s.created_at)) : null;

    return {
      ...s,
      id: String(s.id),
      ma_khoa: String((s.ma_khoa_phong as string) || "").trim(),
      khoa_name: String((s.danh_muc_khoa as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || (s.ten_khoa_phong as string) || "").trim() || "---",
      khu_name: String((s.danh_muc_khu_vuc as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "").trim(),
      ng_gs_ten: String((s.nguoi_giam_sat as { ho_ten?: string } | undefined)?.ho_ten || "").trim(),
      ma_hien_thi: vstSessionDisplayRef(String(s.id), ngayt || null),
      total_opps,
      compliance,
      date_str: dateSrc && Number.isFinite(dateSrc.getTime()) ? dateSrc.toLocaleDateString("vi-VN") : "---",
    } as VstHistoryRow;
  });
}
