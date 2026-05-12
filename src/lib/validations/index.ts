/**
 * Zod Validation Schemas — Re-export tập trung
 * 
 * Import từ "@/lib/validations" để dùng schema validation.
 * Tham chiếu: AGENTS.md + docs/specs/working/LEAN_EXECUTION_BV103.md (Zod ranh giới action)
 */

export * from "./giam-sat-chung.validations";
export * from "./giam-sat-vst.validations";
export * from "./nhan-su.validations";
export * from "./giam-sat-nkbv.validations";
export * from "./cssd-erp.validations";
export * from "./quan-ly-cong-viec.validations";
export * from "./dashboard-compliance.filters";
export * from "./nkbv-list-pagination";
export * from "./fact-list-pagination";
