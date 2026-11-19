import { describe, expect, it } from "vitest";
import { vstSaveSessionSchema } from "./giam-sat-vst.validations";

const KHOA = "11111111-1111-4111-8111-111111111111";
const KHU_VUC = "33333333-3333-4333-8333-333333333333";
const NGHE = "22222222-2222-4222-8222-222222222222";

const baseSession = {
  khoa_id: KHOA,
  khu_vuc_id: KHU_VUC,
  ngay_giam_sat: "2026-07-17",
};

const compliantOpp = {
  thoi_diems: ["Trước khi tiếp xúc người bệnh"],
  hanh_dong: "Chà tay bằng cồn",
  dung_ky_thuat: true,
  du_thoi_gian: true,
};

const missedOpp = {
  thoi_diems: ["Sau khi tiếp xúc người bệnh"],
  hanh_dong: "Bỏ sót",
  co_deo_gang: false,
};

function observation(overrides?: Record<string, unknown>) {
  return {
    khoa_id: KHOA,
    nghe_nghiep_id: NGHE,
    khu_vuc_id: KHU_VUC,
    opportunities: [compliantOpp],
    ...overrides,
  };
}

function parse(observations: unknown[], session: Record<string, unknown> = baseSession) {
  return vstSaveSessionSchema.safeParse({ session, observations });
}

describe("vstSaveSessionSchema — nghe_nghiep_id bắt buộc", () => {
  it("reject khi thiếu nghe_nghiep_id", () => {
    const parsed = parse([
      {
        khoa_id: KHOA,
        opportunities: [compliantOpp],
      },
    ]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("nghe_nghiep_id"))).toBe(true);
    }
  });

  it("reject khi nghe_nghiep_id là chuỗi rỗng", () => {
    const parsed = parse([observation({ nghe_nghiep_id: "" })]);
    expect(parsed.success).toBe(false);
  });

  it("accept khi nghe_nghiep_id UUID hợp lệ", () => {
    const parsed = parse([observation()]);
    expect(parsed.success).toBe(true);
  });
});

describe("vstSaveSessionSchema — cổng ghi phiên VST", () => {
  it("reject khi thiếu khu vực phiên", () => {
    const parsed = parse([observation()], { khoa_id: KHOA, ngay_giam_sat: "2026-07-17" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("khu_vuc_id"))).toBe(true);
    }
  });

  it("reject khi khu vực phiên là chuỗi rỗng", () => {
    const parsed = parse([observation()], {
      khoa_id: KHOA,
      khu_vuc_id: "",
      ngay_giam_sat: "2026-07-17",
    });
    expect(parsed.success).toBe(false);
  });

  it("reject hành động không thuộc 3 giá trị", () => {
    const parsed = parse([
      observation({
        opportunities: [{ ...compliantOpp, hanh_dong: "Lau tay" }],
      }),
    ]);
    expect(parsed.success).toBe(false);
  });

  it("Zod trần cứng 8 đối tượng; tạo mới ≤3 enforce ở action", () => {
    const four = parse([observation(), observation(), observation(), observation()]);
    expect(four.success).toBe(true);
    const nine = Array.from({ length: 9 }, () => observation());
    const parsed = parse(nine);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => String(i.message).includes("8 đối tượng"))).toBe(true);
    }
  });

  it("accept đúng 3 đối tượng", () => {
    expect(parse([observation(), observation(), observation()]).success).toBe(true);
  });

  it("reject khi khoa dòng khác khoa phiên", () => {
    const parsed = parse([
      observation({ khoa_id: "44444444-4444-4444-8444-444444444444" }),
    ]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => String(i.message).includes("khớp khoa"))).toBe(true);
    }
  });

  it("reject thời điểm không thuộc 5 mốc WHO", () => {
    const parsed = parse([
      observation({
        opportunities: [{ ...compliantOpp, thoi_diems: ["Thời điểm bịa"] }],
      }),
    ]);
    expect(parsed.success).toBe(false);
  });

  it("domain §2.1: tuân thủ ≤2 thời điểm; bỏ sót ≤1", () => {
    const ok = parse([
      observation({
        opportunities: [
          {
            ...compliantOpp,
            thoi_diems: [
              "Trước khi tiếp xúc người bệnh",
              "Trước khi làm thủ thuật vô khuẩn",
            ],
          },
          missedOpp,
        ],
      }),
    ]);
    expect(ok.success).toBe(true);

    const overCompliant = parse([
      observation({
        opportunities: [
          {
            ...compliantOpp,
            thoi_diems: [
              "Trước khi tiếp xúc người bệnh",
              "Trước khi làm thủ thuật vô khuẩn",
              "Sau khi tiếp xúc người bệnh",
            ],
          },
        ],
      }),
    ]);
    expect(overCompliant.success).toBe(false);

    const overMissed = parse([
      observation({
        opportunities: [
          {
            ...missedOpp,
            thoi_diems: ["Trước khi tiếp xúc người bệnh", "Sau khi tiếp xúc người bệnh"],
          },
        ],
      }),
    ]);
    expect(overMissed.success).toBe(false);
    if (!overMissed.success) {
      expect(overMissed.error.issues.some((i) => String(i.message).includes("Bỏ sót"))).toBe(true);
    }
  });

  it("VST-03: chấp nhận tuân thủ / bỏ sót không đánh giá kỹ thuật·găng", () => {
    const parsed = parse([
      observation({
        opportunities: [
          { thoi_diems: compliantOpp.thoi_diems, hanh_dong: "Chà tay bằng cồn" },
          { thoi_diems: missedOpp.thoi_diems, hanh_dong: "Bỏ sót" },
        ],
      }),
    ]);
    expect(parsed.success).toBe(true);
  });

  it("reject trùng thời điểm trên một cơ hội", () => {
    const parsed = parse([
      observation({
        opportunities: [
          {
            ...compliantOpp,
            thoi_diems: ["Trước khi tiếp xúc người bệnh", "Trước khi tiếp xúc người bệnh"],
          },
        ],
      }),
    ]);
    expect(parsed.success).toBe(false);
  });
});

describe("vstSaveSessionSchema — Bổ sung người bệnh optional", () => {
  it("accept khi tắt NB (default / gan_nb=false)", () => {
    const parsed = parse([observation()], {
      ...baseSession,
      is_bo_sung_nguoi_benh: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("accept khi thiếu hẳn field NB (không reject)", () => {
    expect(parse([observation()], baseSession).success).toBe(true);
  });

  it("accept khi bật NB kèm mã/tên/giường", () => {
    const parsed = parse([observation()], {
      ...baseSession,
      is_bo_sung_nguoi_benh: true,
      ma_benh_an: "BA-1",
      ma_nguoi_benh: "NB-1",
      ten_nguoi_benh: "Nguyễn A",
      so_giuong_nguoi_benh: "G1",
    });
    expect(parsed.success).toBe(true);
  });
});

/**
 * NEN-016 lát A: Zod 4 `z.string().uuid()` kiểm RFC (nibble phiên bản 1–8) nên từ chối id khoa seed
 * `aaaaaaaa-bbbb-cccc-dddd-000000000001` (id thật của khoa KSNK trên DB local); cột Postgres `uuid` chấp nhận mọi dạng 8-4-4-4-12 hex.
 * Các id này dùng `z.guid()`; id junk vẫn bị từ chối.
 */
describe("vstSaveSessionSchema — id khoa/người giám sát dạng seed không chuẩn RFC (NEN-016)", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const JUNK = "khong-phai-uuid";

  it("khoa_id phiên + dòng quan sát: nhận id seed", () => {
    const parsed = parse([observation({ khoa_id: SEED })], { ...baseSession, khoa_id: SEED });
    expect(parsed.success).toBe(true);
  });

  it("khoa_id phiên + dòng quan sát: nhận UUID v4 chuẩn", () => {
    const parsed = parse([observation({ khoa_id: V4 })], { ...baseSession, khoa_id: V4 });
    expect(parsed.success).toBe(true);
  });

  it("khoa_id phiên: vẫn từ chối chuỗi không phải UUID", () => {
    const parsed = parse([observation()], { ...baseSession, khoa_id: JUNK });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join(".") === "session.khoa_id")).toBe(true);
    }
  });

  it("khoa_id dòng quan sát: vẫn từ chối chuỗi không phải UUID", () => {
    const parsed = parse([observation({ khoa_id: JUNK })]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join(".") === "observations.0.khoa_id")).toBe(true);
    }
  });

  it("nguoi_giam_sat_id: nhận id seed, UUID v4 chuẩn và null", () => {
    expect(parse([observation()], { ...baseSession, nguoi_giam_sat_id: SEED }).success).toBe(true);
    expect(parse([observation()], { ...baseSession, nguoi_giam_sat_id: V4 }).success).toBe(true);
    expect(parse([observation()], { ...baseSession, nguoi_giam_sat_id: null }).success).toBe(true);
  });

  it("nguoi_giam_sat_id: vẫn từ chối chuỗi không phải UUID", () => {
    const parsed = parse([observation()], { ...baseSession, nguoi_giam_sat_id: JUNK });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join(".") === "session.nguoi_giam_sat_id")).toBe(true);
    }
  });

  it("nhan_vien_id dòng quan sát (nhân sự): nhận id seed, UUID v4 chuẩn, null và chuỗi rỗng", () => {
    expect(parse([observation({ nhan_vien_id: SEED })]).success).toBe(true);
    expect(parse([observation({ nhan_vien_id: V4 })]).success).toBe(true);
    expect(parse([observation({ nhan_vien_id: null })]).success).toBe(true);
    expect(parse([observation({ nhan_vien_id: "" })]).success).toBe(true);
  });

  it("nhan_vien_id dòng quan sát: vẫn từ chối chuỗi không phải UUID với câu lỗi cũ", () => {
    const parsed = parse([observation({ nhan_vien_id: JUNK })]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join(".") === "observations.0.nhan_vien_id");
      expect(issue?.message).toBe("Nhân viên không hợp lệ");
    }
  });
});
