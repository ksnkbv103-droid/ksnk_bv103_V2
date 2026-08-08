/**
 * Bản nháp khung điều tra trên tờ BA — mở UI trước khi (hoặc khi chưa) có nkbv_fact_su_kien.
 * Domain: phân tích trên BA; phiếu sự kiện chỉ bắt buộc khi lưu/chốt.
 */

import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";
import type { NkbvChecklistTypeCode } from "./nkbv-loai-labels";

export function isNkbvBaAnalysisDraftId(id: unknown): boolean {
  return String(id || "").startsWith("draft:");
}

export function buildNkbvBaAnalysisDraftRow(input: {
  stay: Record<string, unknown>;
  milestone: BaTimelineMilestone;
  gate: NkbvChecklistTypeCode;
}): Record<string, unknown> {
  const stay = input.stay;
  const m = input.milestone;
  return {
    id: `draft:${m.id}`,
    ma_ca: `DRAFT-${String(m.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(-24)}`,
    ma_benh_an: String(stay.ma_benh_an || ""),
    ma_benh_nhan: String(stay.ma_benh_nhan || ""),
    ho_ten_benh_nhan: String(stay.ho_ten_benh_nhan || ""),
    ngay_sinh: stay.ngay_sinh ? String(stay.ngay_sinh).slice(0, 10) : null,
    gioi_tinh: stay.gioi_tinh ? String(stay.gioi_tinh) : null,
    ngay_vao_vien: stay.ngay_vao_vien ? String(stay.ngay_vao_vien) : null,
    ngay_phat_hien: m.date,
    khoa_ghi_nhan_id: stay.khoa_dieu_tri_id ? String(stay.khoa_dieu_tri_id) : null,
    loai_benh_pham: m.loai_benh_pham || m.title || null,
    tac_nhan_vi_khuan: m.tac_nhan || null,
    vi_tri_nhiem_khuan: m.title || null,
    verification_data: {},
    clinical_notes: {
      timeline_milestone_id: m.id,
      tom_tat_dien_bien: `Nháp điều tra trên BA · Index ${m.id} · gợi ý ${input.gate}`,
    },
    trang_thai_ma: "DANG_GHI_NHAN",
    loai_ma: input.gate,
    _ba_draft: true,
    _draft_milestone_id: m.id,
    _draft_gate: input.gate,
  };
}
