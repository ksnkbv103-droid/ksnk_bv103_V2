/**
 * Đã dùng lâm sàng / phòng mổ trên chu trình bộ — Domain SSOT 17 §17.3
 * (Lead locked §17 defaults 2026-09-24).
 *
 * used_clinically = chu trình đã gắn ca mổ hoặc bệnh nhân sau cấp phát.
 * Nguồn đọc duy nhất: `v_cssd_quy_trinh_full.ma_ca_mo_id`
 * = `cssd_fact_quy_trinh.metadata->>'ma_ca_mo_id'`
 * (ghi khi cấp phát kèm mã ca, hoặc `assignCssdCaMoTrace`).
 * Không thêm cột boolean: proxy này đã có và đúng.
 *
 * `khoa_nhan_id` chỉ là khoa nhận lúc cấp phát — không bật used_clinically.
 * CAP_PHAT + chu trình mở vẫn chưa dùng lâm sàng khi mã ca trống / chỉ toàn khoảng trắng.
 */

export type CssdCycleClinicalUseInput = {
  maCaMoId?: string | null;
  /** Có trên input để không nhầm với mã ca. Predicate không đọc field này. */
  khoaNhanId?: string | null;
};

export function isCssdCycleUsedClinically(cycle: CssdCycleClinicalUseInput): boolean {
  return String(cycle.maCaMoId ?? "").trim().length > 0;
}

export function clinicalUseFromQuyTrinhRow(row: {
  ma_ca_mo_id?: string | null;
  khoa_nhan_id?: string | null;
}): CssdCycleClinicalUseInput {
  return {
    maCaMoId: row.ma_ca_mo_id,
    khoaNhanId: row.khoa_nhan_id,
  };
}

/**
 * Prefilter PostgREST trên view: chưa gắn mã ca (null hoặc chuỗi rỗng).
 * Cổng cuối vẫn là `isCssdCycleUsedClinically` (trim). Không lọc `khoa_nhan_id`.
 */
export const CSSD_CYCLE_NOT_USED_CLINICALLY_OR = "ma_ca_mo_id.is.null,ma_ca_mo_id.eq.";
