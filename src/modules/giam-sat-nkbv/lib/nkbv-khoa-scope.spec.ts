import { describe, expect, it } from "vitest";
import {
  isNkbvHoiDongOnly,
  nkbvKhoaVisible,
  resolveNkbvIdentityRestriction,
  resolveNkbvKhoaRestriction,
} from "./nkbv-khoa-scope";

const base = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: false, actorKhoaId: null, roles: [] as string[] };

describe("resolveNkbvKhoaRestriction", () => {
  it("admin, NV KSNK, Hội đồng xem toàn viện", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, isAdmin: true })).toEqual({ kind: "all" });
    expect(resolveNkbvKhoaRestriction({ ...base, isNhanVienKsnk: true, isMangLuoiKsnk: true })).toEqual({ kind: "all" });
    expect(resolveNkbvKhoaRestriction({ ...base, roles: ["HOI_DONG_KSNK"] })).toEqual({ kind: "all" });
  });
  it("Mạng lưới thuần bị khóa vào khoa mình", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, isMangLuoiKsnk: true, actorKhoaId: " k1 " })).toEqual({ kind: "khoa", khoaId: "k1" });
  });
  it("Mạng lưới chưa gán khoa thì không thấy gì", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, isMangLuoiKsnk: true })).toEqual({ kind: "none" });
  });
});

// gate-ok: NKBV-041 — PO 2026-11-17 (phiếu K5) cho Hội đồng thấy danh tính: đảo đúng một kỳ vọng (Hội đồng thuần: true → false); các ca vai khác giữ nguyên.
describe("isNkbvHoiDongOnly (NKBV-041: PO 2026-11-17 cho Hội đồng thấy danh tính; thay giả định HĐ ≈ BGĐ «Xa» của NKBV-032)", () => {
  const hd = { ...base, roles: ["HOI_DONG_KSNK"] };

  it("chỉ có vai Hội đồng → KHÔNG bị chặn danh tính, phạm vi thống kê vẫn toàn viện", () => {
    expect(isNkbvHoiDongOnly(hd)).toBe(false);
    expect(resolveNkbvKhoaRestriction(hd)).toEqual({ kind: "all" });
  });

  it("Hội đồng kiêm admin / NV KSNK / mạng lưới → vai kia quyết định, không chặn", () => {
    expect(isNkbvHoiDongOnly({ ...hd, isAdmin: true })).toBe(false);
    expect(isNkbvHoiDongOnly({ ...hd, isNhanVienKsnk: true })).toBe(false);
    expect(isNkbvHoiDongOnly({ ...hd, isMangLuoiKsnk: true })).toBe(false);
  });

  it("không có vai Hội đồng → không chặn (các vai khác đã có phạm vi riêng)", () => {
    expect(isNkbvHoiDongOnly(base)).toBe(false);
    expect(isNkbvHoiDongOnly({ ...base, isAdmin: true })).toBe(false);
    expect(isNkbvHoiDongOnly({ ...base, isNhanVienKsnk: true })).toBe(false);
    expect(isNkbvHoiDongOnly({ ...base, isMangLuoiKsnk: true })).toBe(false);
    expect(isNkbvHoiDongOnly({ ...base, roles: ["CHU_NHIEM_KHOA"] })).toBe(false);
  });

  it("Hội đồng kiêm CNK không bị chặn: CNK ≡ TK_KSNK (M03 «X*» với MDRO/RCA); Hội đồng cấp quyền xem, CNK quyết định phạm vi, như gsc-read-scope", () => {
    expect(isNkbvHoiDongOnly({ ...hd, roles: ["HOI_DONG_KSNK", "CHU_NHIEM_KHOA"] })).toBe(false);
  });
});

describe("nkbvKhoaVisible", () => {
  it("khớp khoa điều trị hoặc khoa trên lưới ngày", () => {
    const r = { kind: "khoa", khoaId: "k1" } as const;
    expect(nkbvKhoaVisible(r, ["k2", null, "k1"])).toBe(true);
    expect(nkbvKhoaVisible(r, ["k2", undefined])).toBe(false);
    expect(nkbvKhoaVisible({ kind: "none" }, ["k1"])).toBe(false);
    expect(nkbvKhoaVisible({ kind: "all" }, [])).toBe(true);
  });
});

describe("resolveNkbvIdentityRestriction (NKBV-038: đường đọc danh sách người bệnh có danh tính, mặc định ĐÓNG)", () => {
  it("admin, NV KSNK, Hội đồng → toàn viện", () => {
    expect(resolveNkbvIdentityRestriction({ ...base, isAdmin: true })).toEqual({ kind: "all" });
    expect(resolveNkbvIdentityRestriction({ ...base, isNhanVienKsnk: true })).toEqual({ kind: "all" });
    expect(resolveNkbvIdentityRestriction({ ...base, roles: ["HOI_DONG_KSNK"] })).toEqual({ kind: "all" });
  });

  it("Chủ nhiệm khoa (≡ TK_KSNK, M03) không kiêm Mạng lưới → toàn viện", () => {
    expect(resolveNkbvIdentityRestriction({ ...base, roles: ["CHU_NHIEM_KHOA"], actorKhoaId: "k1" })).toEqual({ kind: "all" });
  });

  it("Mạng lưới kiêm Chủ nhiệm khoa vẫn bị khóa vào khoa mình (không nới so với trước)", () => {
    expect(
      resolveNkbvIdentityRestriction({ ...base, isMangLuoiKsnk: true, roles: ["CHU_NHIEM_KHOA"], actorKhoaId: "k1" }),
    ).toEqual({ kind: "khoa", khoaId: "k1" });
  });

  it("Mạng lưới thuần → khoa mình; chưa gán khoa → không thấy gì", () => {
    expect(resolveNkbvIdentityRestriction({ ...base, isMangLuoiKsnk: true, actorKhoaId: " k1 " })).toEqual({ kind: "khoa", khoaId: "k1" });
    expect(resolveNkbvIdentityRestriction({ ...base, isMangLuoiKsnk: true })).toEqual({ kind: "none" });
  });

  it("vai ngoài KSNK có quyền xem NKBV (ví dụ TO_TRUONG_CSSD_TEST) → chỉ khoa mình; chưa gán khoa → không thấy gì", () => {
    expect(resolveNkbvIdentityRestriction({ ...base, roles: ["TO_TRUONG_CSSD_TEST"], actorKhoaId: "k1" })).toEqual({ kind: "khoa", khoaId: "k1" });
    expect(resolveNkbvIdentityRestriction({ ...base, roles: ["TO_TRUONG_CSSD_TEST"] })).toEqual({ kind: "none" });
  });

  it("không đổi phạm vi thống kê: resolveNkbvKhoaRestriction vẫn toàn viện cho vai ngoài KSNK", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, roles: ["TO_TRUONG_CSSD_TEST"], actorKhoaId: "k1" })).toEqual({ kind: "all" });
  });
});
