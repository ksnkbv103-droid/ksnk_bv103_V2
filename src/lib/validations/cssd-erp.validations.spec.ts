import { describe, expect, it } from "vitest";
import { createSterilizationBatchSchema } from "./cssd-erp.validations";

/**
 * NEN-016 lát D: `nguoiNapId` là id nhân sự (mdm_nhan_su). Zod 4 `.uuid()` kiểm RFC nên từ chối id seed
 * `dddddddd-…-000000000001` trong khi cột Postgres `uuid` chấp nhận. `machineId` giữ `.uuid()` (id máy sinh bằng gen_random_uuid()).
 */
describe("createSterilizationBatchSchema — id người nạp (NEN-016 D)", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const base = { machineId: V4, nguoiNapId: V4, chuongTrinh: "134C" };

  it("nguoiNapId nhận id seed không chuẩn RFC và UUID v4", () => {
    expect(createSterilizationBatchSchema.safeParse({ ...base, nguoiNapId: SEED }).success).toBe(true);
    expect(createSterilizationBatchSchema.safeParse({ ...base, nguoiNapId: V4 }).success).toBe(true);
  });

  it("nguoiNapId từ chối chuỗi rác với câu lỗi cũ", () => {
    const r = createSterilizationBatchSchema.safeParse({ ...base, nguoiNapId: "khong-phai-uuid" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Chọn người nạp từ danh mục");
  });
});
