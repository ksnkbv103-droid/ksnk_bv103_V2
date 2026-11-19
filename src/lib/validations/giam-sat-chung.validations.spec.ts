import { describe, expect, it } from "vitest";
import { gscSaveSessionSchema } from "./giam-sat-chung.validations";

/**
 * NEN-016 lát A: Zod 4 `z.string().uuid()` kiểm RFC (nibble phiên bản 1–8) nên từ chối id khoa seed
 * `aaaaaaaa-bbbb-cccc-dddd-000000000001` (id thật của khoa KSNK trên DB local); cột Postgres `uuid` chấp nhận mọi dạng 8-4-4-4-12 hex.
 * `khoa_id` của phiên GSC dùng `z.guid()`; chuỗi junk vẫn bị từ chối.
 */
const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
const JUNK = "khong-phai-uuid";
const CRITERION = "22222222-2222-4222-8222-222222222222";

function parse(khoa_id: string) {
  return gscSaveSessionSchema.safeParse({
    session: { khoa_id },
    results: [{ criterionId: CRITERION, value: "DAT" }],
  });
}

describe("gscSaveSessionSchema — session.khoa_id (NEN-016)", () => {
  it("nhận id khoa seed không chuẩn RFC", () => {
    expect(parse(SEED).success).toBe(true);
  });

  it("nhận UUID v4 chuẩn", () => {
    expect(parse(V4).success).toBe(true);
  });

  it("vẫn từ chối chuỗi không phải UUID", () => {
    const parsed = parse(JUNK);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join(".") === "session.khoa_id")).toBe(true);
    }
  });
});
