/** Cờ loại trừ CLABSI (NHSN 2026 B4.40–48) — dùng chung form đơn, lưới BA và bridge timeline. */
export const CLABSI_EXCLUSION_FIELDS = [
  ["excl_ecmo_gt2d", "ECMO/ECLS đặt >2 ngày lịch"],
  ["excl_vad_gt2d", "VAD đặt >2 ngày lịch"],
  ["excl_tah_gt2d", "Tim nhân tạo toàn phần (TAH) >2 ngày lịch"],
  ["excl_patient_injection", "Bệnh nhân tự tiêm vào đường truyền (có ghi nhận)"],
  ["excl_epidermolysis_bullosa", "Epidermolysis bullosa"],
  ["excl_munchausen_proxy", "Munchausen by proxy"],
  ["excl_pus_vascular_site", "Mủ tại vị trí tiếp cận mạch, cùng tác nhân với cấy máu"],
] as const;

export type ClabsiExclusionKey = (typeof CLABSI_EXCLUSION_FIELDS)[number][0];
export type ClabsiExclusions = Partial<Record<ClabsiExclusionKey, boolean>>;

/** Chỉ giữ cờ true để verification_data gọn. */
export function pickClabsiExclusions(src: ClabsiExclusions | null | undefined): ClabsiExclusions {
  const out: ClabsiExclusions = {};
  for (const [k] of CLABSI_EXCLUSION_FIELDS) if (src?.[k]) out[k] = true;
  return out;
}
