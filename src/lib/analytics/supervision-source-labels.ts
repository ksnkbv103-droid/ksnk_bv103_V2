/**
 * Nhãn nguồn giám sát trên màn hình / bản in.
 * Không đổi mã RPC (`vol_tgs`, `vol_ksnk`) hay công thức tỷ lệ.
 */

/**
 * Nhãn % báo cáo — khóa tên để không lẫn chỉ số.
 * `ty_le_dung_ky_thuat` = phụ trên phiếu WHO (trong số đã tuân thủ).
 * `ty_le_vst_ky_thuat` = BM.02 (engine bảng kiểm). Không dùng chung một nhãn.
 */
export const PCT_SURFACE_LABEL = {
  gscPool: "pool GSC (mọi BK)",
  whoPhuDungKyThuat: "WHO phụ · ty_le_dung_ky_thuat",
  whoTyLeVst: "WHO · ty_le_vst",
  bm02KyThuat: "BM.02 · ty_le_vst_ky_thuat",
  bm03NgoaiKhoa: "BM.03 · ty_le_vst_ngoai_khoa",
} as const;

export const SUPERVISION_SOURCE_UI = {
  tgs: "Tự giám sát",
  ksnk: "Chuyên trách",
  tgsPct: "Tự GS %",
  ksnkPct: "Chuyên trách %",
  tgsVolShort: "Tự GS",
  ksnkVolShort: "Chuyên trách",
  vstTgsVol: "Cơ hội tự giám sát",
  vstKsnkVol: "Cơ hội chuyên trách",
  gscTgsVol: "Khảo sát tự giám sát",
  gscKsnkVol: "Khảo sát chuyên trách",
} as const;

const EXCLUSION_UI: Record<string, string> = {
  "Chưa triển khai": "Chưa triển khai",
  "Chưa TGS": "Chưa tự giám sát",
  "Chưa KSNK": "Chưa chuyên trách",
};

export function labelGapExclusion(reason: string | null | undefined): string {
  if (!reason) return "—";
  return EXCLUSION_UI[reason] ?? reason;
}
