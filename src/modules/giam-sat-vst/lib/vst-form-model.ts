import type { VSTOpportunity } from "./vst-constants";

export interface ExtendedOpportunity extends VSTOpportunity {
  id: string;
  isCollapsed: boolean;
}

export interface VSTFormPerson {
  id_col: string;
  nghe_nghiep_id: string;
  nhan_vien_id: string;
  is_manual: boolean;
  ten_manual: string;
  opportunities: ExtendedOpportunity[];
}

/** Các trường cấp person mà UI cập nhật trực tiếp. */
export type VSTPersonUpdatableField = keyof Pick<
  VSTFormPerson,
  "id_col" | "nghe_nghiep_id" | "nhan_vien_id" | "is_manual" | "ten_manual"
>;

/** Các trường đánh giá trên một cơ hội (bỏ id/isCollapsed). */
export type VSTOppAssessmentField = keyof Pick<
  VSTOpportunity,
  "dung_ky_thuat" | "du_thoi_gian" | "co_deo_gang" | "thoi_gian_ghi_nhan"
>;

export const createNewOpp = (): ExtendedOpportunity => ({
  id: Math.random().toString(36).slice(2, 11),
  thoi_diems: [],
  hanh_dong: null,
  dung_ky_thuat: null,
  du_thoi_gian: null,
  co_deo_gang: null,
  isCollapsed: false,
});

export function createDefaultVSTFormPersons(): VSTFormPerson[] {
  return (["col1", "col2", "col3"] as const).map((id_col) => ({
    id_col,
    nghe_nghiep_id: "",
    nhan_vien_id: "",
    is_manual: false,
    ten_manual: "",
    opportunities: [createNewOpp()],
  }));
}

export const normalizeRecordTime = (recordTime: string | undefined, ngayGiamSat: string) => {
  if (!recordTime) return new Date().toISOString();
  if (recordTime.includes("T")) return recordTime;
  const d = new Date(ngayGiamSat);
  const [h, m, s] = recordTime.split(":");
  d.setHours(parseInt(h, 10), parseInt(m, 10), parseInt(s || "0", 10), 0);
  return d.toISOString();
};
