import { beforeEach, describe, expect, it, vi } from "vitest";

/** NKBV-005: người chỉ có quyền GSC đọc MDRO/RCA bằng admin client → luôn bó theo khoa của họ, kể cả khi mang vai rộng. */
const mocks = vi.hoisted(() => ({ scope: vi.fn(), verify: vi.fn() }));

vi.mock("@/lib/supabase-server", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: mocks.scope }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verify }));

import { getNkbvCensusAccess, getNkbvIdentityScope } from "./nkbv-khoa-scope.server";

const K1 = "11111111-1111-4111-8111-111111111111";
/** Chỉ có vai Hội đồng. NKBV-032: HĐ ≈ BGĐ «Xa» là GIẢ ĐỊNH (M03 không có mã HOI_DONG). */
const wide = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: false, roles: ["HOI_DONG_KSNK"] };
const nvKsnk = { isAdmin: false, isNhanVienKsnk: true, isMangLuoiKsnk: false, roles: ["NHAN_VIEN_KSNK"] };
const mangLuoi = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: true, roles: ["MANG_LUOI_KSNK"] };
const hdKiemMangLuoi = { ...mangLuoi, roles: ["HOI_DONG_KSNK", "MANG_LUOI_KSNK"] };
const hdKiemAdmin = { ...wide, isAdmin: true };
/** CNK ≡ TK_KSNK (VST-026): Hội đồng cấp quyền xem, CNK quyết định phạm vi, như gsc-read-scope. */
const hdKiemCnk = { ...wide, roles: ["HOI_DONG_KSNK", "CHU_NHIEM_KHOA"] };
const khongVai = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: false, roles: [] as string[] };

beforeEach(() => vi.clearAllMocks());

// gate-ok: NKBV-032 — ba kỳ vọng cũ của getNkbvCensusAccess được viết lại nhiều dòng và THÊM trường identityDenied (kiểm chặt hơn, không bỏ kiểm).
describe("getNkbvCensusAccess", () => {
  it("vai rộng nhưng không có quyền xem NKBV: chỉ khoa của mình", async () => {
    mocks.verify.mockRejectedValue(new Error("không có quyền"));
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: K1 });
    expect(await getNkbvCensusAccess()).toEqual({
      restriction: { kind: "khoa", khoaId: K1 },
      viaGscOnly: true,
      identityDenied: true,
    });
  });

  it("vai rộng, không có quyền xem NKBV, chưa gán khoa: không thấy gì", async () => {
    mocks.verify.mockRejectedValue(new Error("không có quyền"));
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: null });
    expect(await getNkbvCensusAccess()).toEqual({
      restriction: { kind: "none" },
      viaGscOnly: true,
      identityDenied: true,
    });
  });

  it("có quyền xem NKBV: giữ phạm vi theo vai, đọc qua RLS", async () => {
    mocks.verify.mockResolvedValue(undefined);
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: K1 });
    expect(await getNkbvCensusAccess()).toEqual({
      restriction: { kind: "all" },
      viaGscOnly: false,
      identityDenied: true,
    });
  });
});

describe("NKBV-032 cờ identityDenied: chỉ Hội đồng thuần mới bị chặn danh sách có danh tính", () => {
  it.each([
    ["NV KSNK", nvKsnk],
    ["Hội đồng kiêm Mạng lưới", hdKiemMangLuoi],
    ["Hội đồng kiêm admin", hdKiemAdmin],
    ["Hội đồng kiêm CHU_NHIEM_KHOA", hdKiemCnk],
    ["không có vai Hội đồng", khongVai],
  ])("%s: không chặn", async (_ten, scope) => {
    mocks.verify.mockResolvedValue(undefined);
    mocks.scope.mockResolvedValue({ ...scope, actorKhoaId: K1 });
    expect((await getNkbvCensusAccess()).identityDenied).toBe(false);
  });

  it("đường chỉ-có-quyền-GSC: cờ tính theo vai, không theo đường đọc", async () => {
    mocks.verify.mockRejectedValue(new Error("không có quyền"));
    mocks.scope.mockResolvedValue({ ...khongVai, actorKhoaId: K1 });
    expect(await getNkbvCensusAccess()).toEqual({
      restriction: { kind: "khoa", khoaId: K1 },
      viaGscOnly: true,
      identityDenied: false,
    });
  });
});

describe("getNkbvIdentityScope (một lần đọc scope cho listInpatientsByKhoa)", () => {
  it("Hội đồng thuần: thống kê toàn viện nhưng bị chặn danh tính", async () => {
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: K1 });
    expect(await getNkbvIdentityScope()).toEqual({ restriction: { kind: "all" }, identityDenied: true });
  });

  it("Mạng lưới thuần: bó theo khoa, không bị chặn danh tính", async () => {
    mocks.scope.mockResolvedValue({ ...mangLuoi, actorKhoaId: K1 });
    expect(await getNkbvIdentityScope()).toEqual({ restriction: { kind: "khoa", khoaId: K1 }, identityDenied: false });
  });

  it("NV KSNK: toàn viện, không chặn", async () => {
    mocks.scope.mockResolvedValue({ ...nvKsnk, actorKhoaId: null });
    expect(await getNkbvIdentityScope()).toEqual({ restriction: { kind: "all" }, identityDenied: false });
  });

  it("chỉ đọc scope một lần", async () => {
    mocks.scope.mockResolvedValue({ ...wide, actorKhoaId: null });
    await getNkbvIdentityScope();
    expect(mocks.scope).toHaveBeenCalledTimes(1);
  });
});
