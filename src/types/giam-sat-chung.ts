/**
 * Re-export SSOT từ module GSC — tránh drift giữa `@/types` và `modules/giam-sat-chung/types`.
 */
export type {
  BangKiemCachTinhDiem,
  BangKiemDoiTuongGiamSat,
  BangKiemLoaiGiamSat,
  BangKiemMetadataV4,
  BangKiemPhanLoaiChuyenMon,
  ChecklistCriterion,
  ChecklistResult,
  ChecklistResultValue,
  ChecklistTemplate,
  GscFilters,
  GscSessionHistoryRow,
} from "@/modules/giam-sat-chung/types";
