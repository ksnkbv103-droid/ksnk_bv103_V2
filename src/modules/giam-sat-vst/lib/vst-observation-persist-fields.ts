/**
 * Chuẩn hóa trường lưu `gstt_fact_vst` — FK + vi_tri; nhãn đọc `v_gstt_giam_sat_vst_full`.
 */

export type VstObservationPersistInput = {
  khu_vuc_id?: string | null;
  nghe_nghiep_id?: string | null;
  vi_tri?: string | null;
};

export type VstObservationPersistRow = {
  khu_vuc_id: string | null;
  nghe_nghiep_id: string | null;
  vi_tri: string;
};

function trimOrEmpty(v: unknown): string {
  return String(v ?? "").trim();
}

export function buildVstObservationPersistRow(params: {
  sessionKhuVucId?: string | null;
  sessionViTri?: string | null;
  ngheNghiepId?: string | null;
  legacyViTri?: string | null;
}): VstObservationPersistRow {
  return {
    khu_vuc_id: trimOrEmpty(params.sessionKhuVucId) || null,
    nghe_nghiep_id: trimOrEmpty(params.ngheNghiepId) || null,
    vi_tri: trimOrEmpty(params.legacyViTri ?? params.sessionViTri),
  };
}
