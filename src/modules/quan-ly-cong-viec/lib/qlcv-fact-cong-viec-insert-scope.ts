/**
 * Phạm vi công việc trên DB còn cột `loai_pham_vi` NOT NULL (trước migration `20260715001`).
 * Sau khi mọi môi trường đã `DROP COLUMN loai_pham_vi`, bỏ spread này khỏi các `.insert(...)`.
 */
export const QLCV_FACT_CONG_VIEC_INSERT_LOAI_PHAM_VI = { loai_pham_vi: "NOI_BO" as const };
