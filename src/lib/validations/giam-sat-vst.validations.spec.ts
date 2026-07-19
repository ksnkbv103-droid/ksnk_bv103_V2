import { describe, expect, it } from "vitest";
import { vstSaveSessionSchema } from "./giam-sat-vst.validations";

const baseSession = {
  khoa_id: "11111111-1111-4111-8111-111111111111",
  ngay_giam_sat: "2026-07-17",
};

const baseOpp = {
  thoi_diems: ["Trước khi tiếp xúc người bệnh"],
  hanh_dong: "Chà tay bằng cồn",
};

describe("vstSaveSessionSchema — nghe_nghiep_id bắt buộc", () => {
  it("reject khi thiếu nghe_nghiep_id", () => {
    const parsed = vstSaveSessionSchema.safeParse({
      session: baseSession,
      observations: [
        {
          khoa_id: baseSession.khoa_id,
          opportunities: [baseOpp],
        },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("nghe_nghiep_id"))).toBe(true);
    }
  });

  it("reject khi nghe_nghiep_id là chuỗi rỗng", () => {
    const parsed = vstSaveSessionSchema.safeParse({
      session: baseSession,
      observations: [
        {
          khoa_id: baseSession.khoa_id,
          nghe_nghiep_id: "",
          opportunities: [baseOpp],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("accept khi nghe_nghiep_id UUID hợp lệ", () => {
    const parsed = vstSaveSessionSchema.safeParse({
      session: baseSession,
      observations: [
        {
          khoa_id: baseSession.khoa_id,
          nghe_nghiep_id: "22222222-2222-4222-8222-222222222222",
          opportunities: [baseOpp],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
