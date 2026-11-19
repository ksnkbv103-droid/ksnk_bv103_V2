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

describe("parseCongViecUpdate — chỉ kiểm trường được gửi", () => {
  it("không tự điền giá trị mặc định cho trường không gửi", async () => {
    const { parseCongViecUpdate } = await import("./quan-ly-cong-viec.validations");
    const res = parseCongViecUpdate({ tieu_de: "  Rà soát  " });
    expect(res).toEqual({ ok: true, data: { tieu_de: "Rà soát" } });
  });

  it("từ chối mã người phụ trách sai và tiêu đề rỗng", async () => {
    const { parseCongViecUpdate } = await import("./quan-ly-cong-viec.validations");
    expect(parseCongViecUpdate({ nguoi_phu_trach_id: "abc" }).ok).toBe(false);
    expect(parseCongViecUpdate({ tieu_de: "   " }).ok).toBe(false);
  });

  it("bỏ qua trường ngoài schema (trang_thai, %) để action tự xử lý", async () => {
    const { parseCongViecUpdate } = await import("./quan-ly-cong-viec.validations");
    expect(parseCongViecUpdate({ trang_thai: "HOAN_THANH", phan_tram_hoan_thanh: 50 })).toEqual({ ok: true, data: {} });
  });
});

describe("congViecSchema — nhiều khoa địa điểm (L3)", () => {
  const base = {
    tieu_de: "Việc thử",
    loai_cong_viec: "DOT_XUAT",
    muc_do_uu_tien: "TRUNG_BINH",
    nguoi_phu_trach_id: uuid,
    han_hoan_thanh: "2026-12-31",
  };
  it("nhận mảng dia_diem_khoa_ids hợp lệ, từ chối id sai", () => {
    expect(congViecSchema.safeParse({ ...base, dia_diem_khoa_ids: [uuid] }).success).toBe(true);
    expect(congViecSchema.safeParse({ ...base, dia_diem_khoa_ids: ["abc"] }).success).toBe(false);
  });
});

/**
 * NEN-016 lát C: id khoa (dia_diem_khoa_id/_ids, analytics_meta.khoa_id) và id nhân sự (nguoi_phu_trach_id,
 * nguoi_phoi_hop_ids, nguoi_theo_doi_ids) dùng `z.guid()` — id seed không chuẩn RFC phải được nhận.
 */
describe("congViecSchema — id khoa/nhân sự (NEN-016 C)", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const JUNK = "khong-phai-uuid";
  const base = { tieu_de: "Việc thử", loai_cong_viec: "DOT_XUAT", muc_do_uu_tien: "TRUNG_BINH", han_hoan_thanh: "2026-12-31" };
  const SCALARS = [
    ["nguoi_phu_trach_id", "Người thực hiện không hợp lệ"],
    ["to_cong_tac_id", "Tổ công tác không hợp lệ"],
    ["nhom_chuyen_mon_id", "Nhóm chuyên môn không hợp lệ"],
    ["dia_diem_khoa_id", "Khoa/đơn vị địa điểm không hợp lệ"],
    ["nhiem_vu_id", "Nhiệm vụ không hợp lệ"],
  ] as const;

  it.each(SCALARS)("%s nhận id seed không chuẩn RFC, UUID v4, null và rỗng", (field) => {
    expect(congViecSchema.safeParse({ ...base, [field]: SEED }).success).toBe(true);
    expect(congViecSchema.safeParse({ ...base, [field]: V4 }).success).toBe(true);
    expect(congViecSchema.safeParse({ ...base, [field]: null }).success).toBe(true);
    expect(congViecSchema.safeParse({ ...base, [field]: "" }).success).toBe(true);
  });

  it.each(SCALARS)("%s vẫn từ chối chuỗi rác, giữ câu lỗi cũ", (field, message) => {
    const r = congViecSchema.safeParse({ ...base, [field]: JUNK });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === field)?.message).toBe(message);
  });

  const ARRAYS = [
    ["dia_diem_khoa_ids", "Khoa địa điểm không hợp lệ"],
    ["nguoi_phoi_hop_ids", "Người phối hợp không hợp lệ"],
    ["nguoi_theo_doi_ids", "Người theo dõi không hợp lệ"],
  ] as const;

  it.each(ARRAYS)("%s nhận id seed không chuẩn RFC cùng UUID v4", (field) => {
    expect(congViecSchema.safeParse({ ...base, [field]: [SEED, V4] }).success).toBe(true);
  });

  it.each(ARRAYS)("%s vẫn từ chối phần tử rác, giữ câu lỗi cũ", (field, message) => {
    const r = congViecSchema.safeParse({ ...base, [field]: [SEED, JUNK] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(message);
  });

  it("analytics_meta.khoa_id nhận id seed, vẫn từ chối chuỗi rác", () => {
    expect(congViecSchema.safeParse({ ...base, analytics_meta: { khoa_id: SEED } }).success).toBe(true);
    expect(congViecSchema.safeParse({ ...base, analytics_meta: { khoa_id: V4 } }).success).toBe(true);
    expect(congViecSchema.safeParse({ ...base, analytics_meta: { khoa_id: JUNK } }).success).toBe(false);
  });
});
