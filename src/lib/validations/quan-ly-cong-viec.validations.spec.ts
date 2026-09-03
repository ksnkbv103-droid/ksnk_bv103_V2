import { describe, expect, it } from "vitest";
import { congViecSchema } from "./quan-ly-cong-viec.validations";

const khoaId = "11111111-1111-4111-8111-111111111111";

describe("congViecSchema — địa điểm khoa", () => {
  it("chặn payload phê duyệt thiếu dia_diem_khoa_id", () => {
    const parsed = congViecSchema.safeParse({
      tieu_de: "Đề xuất thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      nguoi_phu_trach_id: khoaId,
      to_cong_tac_id: khoaId,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("dia_diem_khoa_id"))).toBe(true);
    }
  });

  it("nhận UUID khoa địa điểm", () => {
    const parsed = congViecSchema.safeParse({
      tieu_de: "Đề xuất thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      nguoi_phu_trach_id: khoaId,
      to_cong_tac_id: khoaId,
      dia_diem_khoa_id: khoaId,
    });
    expect(parsed.success).toBe(true);
  });
});
