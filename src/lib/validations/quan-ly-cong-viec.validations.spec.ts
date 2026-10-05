import { describe, expect, it } from "vitest";
import {
  congViecSchema,
  congViecCreateSchema,
} from "./quan-ly-cong-viec.validations";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("congViecSchema — Domain A optional dia_diem", () => {
  it("cho phép thiếu dia_diem_khoa_id", () => {
    const parsed = congViecSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      nguoi_phu_trach_id: uuid,
      han_hoan_thanh: "2026-12-31",
    });
    expect(parsed.success).toBe(true);
  });

  it("nhận UUID khoa địa điểm khi có", () => {
    const parsed = congViecSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      nguoi_phu_trach_id: uuid,
      dia_diem_khoa_id: uuid,
      han_hoan_thanh: "2026-12-31",
    });
    expect(parsed.success).toBe(true);
  });

  it("null/empty dia_diem → null", () => {
    const parsed = congViecSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DINH_KY",
      muc_do_uu_tien: "TRUNG_BINH",
      dia_diem_khoa_id: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.dia_diem_khoa_id ?? null).toBeNull();
  });
});

describe("congViecCreateSchema — người thực hiện + hạn", () => {
  it("chặn tạo thiếu người thực hiện", () => {
    const parsed = congViecCreateSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      han_hoan_thanh: "2026-12-31",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("nguoi_phu_trach_id"))).toBe(true);
    }
  });

  it("chặn đột xuất thiếu hạn", () => {
    const parsed = congViecCreateSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      nguoi_phu_trach_id: uuid,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("han_hoan_thanh"))).toBe(true);
    }
  });

  it("chặn nguon_lien_ket.href javascript/ngoài", () => {
    const bad = congViecSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DINH_KY",
      muc_do_uu_tien: "TRUNG_BINH",
      nguon_lien_ket: { module: "GIAM_SAT", href: "javascript:alert(1)" },
    });
    expect(bad.success).toBe(false);

    const ext = congViecSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DINH_KY",
      muc_do_uu_tien: "TRUNG_BINH",
      nguon_lien_ket: { module: "GIAM_SAT", href: "https://evil.example" },
    });
    expect(ext.success).toBe(false);

    const ok = congViecSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DINH_KY",
      muc_do_uu_tien: "TRUNG_BINH",
      nguon_lien_ket: { module: "GIAM_SAT", href: "/giam-sat-chung?edit=1" },
    });
    expect(ok.success).toBe(true);
  });

  it("nhận payload create tối thiểu Domain A", () => {
    const parsed = congViecCreateSchema.safeParse({
      tieu_de: "Việc thử",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      nguoi_phu_trach_id: uuid,
      han_hoan_thanh: "2026-12-31",
    });
    expect(parsed.success).toBe(true);
  });
});
