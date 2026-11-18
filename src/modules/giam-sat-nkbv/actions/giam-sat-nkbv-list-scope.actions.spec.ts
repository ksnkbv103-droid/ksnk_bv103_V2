import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  restriction: vi.fn(),
  viaGsc: { v: false },
  denied: { v: false },
  guest: { v: false },
  admin: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyAnyPermission: vi.fn(async () => {}),
  verifyPermission: vi.fn(async () => {}),
}));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvCensusAccess: async () => ({
    restriction: await mocks.restriction(),
    viaGscOnly: mocks.viaGsc.v,
    identityDenied: mocks.denied.v,
    guestDenied: mocks.guest.v,
  }),
  getNkbvIdentityScope: async () => ({ restriction: await mocks.restriction(), identityDenied: mocks.denied.v }),
  NKBV_GSC_NO_KHOA_ERROR: "NO_KHOA",
  NKBV_NO_KHOA_ERROR: "NO_KHOA_CHUNG",
  NKBV_OUT_OF_SCOPE_ERROR: "OUT_OF_SCOPE",
}));
const makeClient = (tag: string) => ({
    from: () => {
      mocks.admin(tag);
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.is = () => chain;
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.eq = (...a: unknown[]) => {
        mocks.eq(...a);
        return chain;
      };
      chain.then = (res: (v: unknown) => void) => res({ data: [], error: null });
      return chain;
    },
});
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: async () => makeClient("user"),
  createAdminSupabaseClient: () => makeClient("admin"),
}));

import { NKBV_GUEST_IDENTITY_DENIED, NKBV_HOI_DONG_IDENTITY_DENIED } from "../lib/nkbv-khoa-scope";
import { getPatientMdroSupervisionStatus, listMdroInpatientsByKhoa } from "./giam-sat-nkbv-mdro.actions";
import { listNkbvPatientRcaByKhoa } from "./giam-sat-nkbv-rca.actions";
import { listGiamSatNkbvCas, listInpatientsByKhoa, listNkbvMedicalRecords } from "./giam-sat-nkbv-read.actions";

const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const khoaEqs = () => mocks.eq.mock.calls.filter((c) => c[0] === "khoa_dieu_tri_id").map((c) => c[1]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.viaGsc.v = false;
  mocks.denied.v = false;
  mocks.guest.v = false;
});

describe("NK-SCOPE danh sách MDRO / RCA theo khoa", () => {
  it("kind=khoa: khoa đúng hoặc rỗng → ép khoa của mình", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    await listMdroInpatientsByKhoa({ khoaId: K1 });
    await listMdroInpatientsByKhoa({ khoaId: "" });
    await listNkbvPatientRcaByKhoa({ khoaId: K1 });
    await listNkbvPatientRcaByKhoa({ khoaId: "" });
    expect(khoaEqs()).toEqual([K1, K1, K1, K1]);
  });

  // gate-ok: NKBV-046 — kỳ vọng cũ «khoa lạ → vẫn trả BN khoa mình» làm ô khoa của panel gắn nhãn sai; đổi thành lỗi OUT_OF_SCOPE, không truy vấn.
  it("NKBV-046 kind=khoa: chọn khoa khác khoa mình → OUT_OF_SCOPE, không truy vấn", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toEqual({ success: false, error: "OUT_OF_SCOPE", data: [] });
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toEqual({ success: false, error: "OUT_OF_SCOPE", data: [] });
    expect(await getPatientMdroSupervisionStatus({ maBenhAn: "BA1", khoaId: K2 })).toMatchObject({
      success: false,
      error: "OUT_OF_SCOPE",
    });
    expect(mocks.eq).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  // gate-ok: NKBV-043 — kỳ vọng cũ «none → success []» chính là lỗi (báo «không có BN» khi chưa gán khoa); đổi thành lỗi rõ, giữ số expect.
  it("kind=none (có NKBV:view, chưa gán khoa — NKBV-043): báo lỗi, không truy vấn", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toEqual({ success: false, error: "NO_KHOA", data: [] });
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toEqual({ success: false, error: "NO_KHOA", data: [] });
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it("kind=all: giữ hành vi cũ", async () => {
    mocks.restriction.mockResolvedValue({ kind: "all" });
    await listMdroInpatientsByKhoa({ khoaId: K2 });
    await listMdroInpatientsByKhoa({});
    await listNkbvPatientRcaByKhoa({ khoaId: K2 });
    expect(khoaEqs()).toEqual([K2, K2]);
  });

  it("NKBV-005 GSC-only trong khoa: đọc bằng admin client, ép khoa của mình", async () => {
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    await listMdroInpatientsByKhoa({ khoaId: K1 });
    await listNkbvPatientRcaByKhoa({ khoaId: "" });
    expect(khoaEqs()).toEqual([K1, K1]);
    expect(new Set(mocks.admin.mock.calls.map((c) => c[0]))).toEqual(new Set(["admin"]));
  });

  it("NKBV-005 GSC-only không xác định được khoa: trả lỗi rõ, không rỗng-success", async () => {
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toMatchObject({ success: false, error: "NO_KHOA" });
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toMatchObject({ success: false, error: "NO_KHOA" });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("NKBV-005 có quyền NKBV: vẫn dùng user client (RLS)", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    await listMdroInpatientsByKhoa({});
    expect(new Set(mocks.admin.mock.calls.map((c) => c[0]))).toEqual(new Set(["user"]));
  });
});

/** NKBV-032: HĐ ≈ BGĐ «Xa» (M03) là GIẢ ĐỊNH — M03 không có mã HOI_DONG; chờ PO xác nhận. */
describe("NKBV-032 Hội đồng thuần không nhận danh sách người bệnh có danh tính", () => {
  const denied = { success: false, error: NKBV_HOI_DONG_IDENTITY_DENIED, data: [] };

  it("hằng thông báo là chuỗi không rỗng, nêu rõ Hội đồng", () => {
    expect(typeof NKBV_HOI_DONG_IDENTITY_DENIED).toBe("string");
    expect(NKBV_HOI_DONG_IDENTITY_DENIED).toMatch(/Hội đồng/);
  });

  it("MDRO, RCA, nội trú theo khoa: lỗi rõ + mảng rỗng, không chạm bảng nào", async () => {
    mocks.denied.v = true;
    mocks.restriction.mockResolvedValue({ kind: "all" });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toEqual(denied);
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toEqual(denied);
    expect(await listInpatientsByKhoa({ khoaId: K2 })).toEqual(denied);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it("trạng thái MDRO của một người bệnh thừa hưởng lỗi chặn, không truy vấn", async () => {
    mocks.denied.v = true;
    mocks.restriction.mockResolvedValue({ kind: "all" });
    expect(await getPatientMdroSupervisionStatus({ maBenhAn: "BA1" })).toMatchObject({
      success: false,
      error: NKBV_HOI_DONG_IDENTITY_DENIED,
    });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("chặn danh tính đi trước lỗi thiếu khoa của đường GSC: không NO_KHOA, không đọc bằng admin client", async () => {
    mocks.denied.v = true;
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toMatchObject({
      success: false,
      error: NKBV_HOI_DONG_IDENTITY_DENIED,
    });
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toMatchObject({
      success: false,
      error: NKBV_HOI_DONG_IDENTITY_DENIED,
    });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("không bị chặn: nội trú theo khoa giữ nguyên (ngoài khoa → lỗi phạm vi, trong khoa → truy vấn)", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    expect(await listInpatientsByKhoa({ khoaId: K2 })).toMatchObject({ success: false, error: "OUT_OF_SCOPE" });
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(await listInpatientsByKhoa({ khoaId: K1 })).toMatchObject({ success: true });
    expect(khoaEqs()).toEqual([K1]);
  });
});

/**
 * NKBV-043: người chỉ có GIAM_SAT_CHUNG:view (vd Chủ nhiệm khoa) bị RLS nkbv cắt hết → «Xem tất cả BN khoa» rỗng im lặng.
 * listInpatientsByKhoa đi qua getNkbvCensusAccess như MDRO/RCA (NKBV-005): GSC-only đọc admin client, ép khoa của mình.
 */
describe("NKBV-043 nội trú theo khoa qua getNkbvCensusAccess", () => {
  it("GSC-only có khoa: đọc bằng admin client, chỉ khoa của mình", async () => {
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    expect(await listInpatientsByKhoa({ khoaId: K1 })).toMatchObject({ success: true });
    expect(new Set(mocks.admin.mock.calls.map((c) => c[0]))).toEqual(new Set(["admin"]));
    expect(khoaEqs()).toEqual([K1]);
  });

  it("GSC-only xin khoa khác hoặc không có khoa: lỗi rõ, không truy vấn", async () => {
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    expect(await listInpatientsByKhoa({ khoaId: K2 })).toMatchObject({ success: false, error: "OUT_OF_SCOPE" });
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listInpatientsByKhoa({ khoaId: K1 })).toMatchObject({ success: false, error: "OUT_OF_SCOPE" });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("khách thống kê (NKBV-033): báo lỗi khách, không truy vấn", async () => {
    mocks.guest.v = true;
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listInpatientsByKhoa({ khoaId: K1 })).toEqual({
      success: false,
      error: NKBV_GUEST_IDENTITY_DENIED,
      data: [],
    });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("có NKBV:view toàn viện (CB KSNK): user client, khoa theo tham số", async () => {
    mocks.restriction.mockResolvedValue({ kind: "all" });
    expect(await listInpatientsByKhoa({ khoaId: K2 })).toMatchObject({ success: true });
    expect(new Set(mocks.admin.mock.calls.map((c) => c[0]))).toEqual(new Set(["user"]));
    expect(khoaEqs()).toEqual([K2]);
  });
});

/**
 * NKBV-045: cùng lớp lỗi NKBV-043 — phạm vi «none» (có NKBV:view nhưng chưa gán khoa) không được trả success rỗng,
 * vì người dùng đọc là «khoa chưa có ca/hồ sơ». Lỗi rõ, không truy vấn.
 */
describe("NKBV-045 danh sách ca và hồ sơ BA: phạm vi none báo lỗi rõ", () => {
  const noKhoa = { success: false, error: "NO_KHOA_CHUNG", data: [], totalCount: 0 };

  it("kind=none: listGiamSatNkbvCas và listNkbvMedicalRecords trả lỗi, không truy vấn", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listGiamSatNkbvCas({ page: 1 })).toEqual(noKhoa);
    expect(await listNkbvMedicalRecords({ page: 1 })).toEqual(noKhoa);
    expect(mocks.eq).not.toHaveBeenCalled();
  });

});
