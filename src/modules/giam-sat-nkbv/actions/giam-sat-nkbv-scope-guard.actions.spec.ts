import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  restriction: vi.fn(),
  inScope: vi.fn(),
  viSinhRow: vi.fn(),
  update: vi.fn(),
  validateKhoa: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
  verifyAnyPermission: vi.fn(async () => {}),
}));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: vi.fn(async () => null) }));
vi.mock("@/lib/master-data/validation", () => ({
  normalizeAndValidateDmKhoaPhong: mocks.validateKhoa,
}));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: mocks.restriction,
  isNkbvBenhAnInScope: mocks.inScope,
  NKBV_OUT_OF_SCOPE_ERROR: "Hồ sơ nằm ngoài khoa của bạn.",
}));
vi.mock("../lib/nkbv-ba-ngay-sync", () => ({ syncNkbvPhieuFromBaNgay: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () =>
        table === "nkbv_fact_vi_sinh"
          ? mocks.viSinhRow()
          : { data: { ngay_vao_vien: "2026-11-01", ngay_ra_vien: null }, error: null };
      chain.update = (...a: unknown[]) => {
        mocks.update(...a);
        return chain;
      };
      chain.upsert = async () => ({ error: null });
      chain.delete = () => chain;
      chain.then = (res: (v: unknown) => void) => res({ error: null });
      return chain;
    },
  }),
}));

import { importBenhAnExcel, importViSinhExcel, previewViSinhImportAlerts } from "./giam-sat-nkbv-import.actions";
import { markNkbvViSinhKhongDuTc, skipNkbvViSinhAnalysis } from "./giam-sat-nkbv-ba-analysis.actions";
import { upsertNkbvBaNgayKhoa } from "./giam-sat-nkbv-ba-ngay.actions";

const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const VS = "33333333-3333-4333-8333-333333333333";
const OUT = "Hồ sơ nằm ngoài khoa của bạn.";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
  mocks.inScope.mockResolvedValue(true);
  mocks.validateKhoa.mockResolvedValue(K1);
});

describe("NKBV import — phạm vi khoa", () => {
  const ba = { ma_benh_an: "BA1", ma_benh_nhan: "P1", ho_ten_benh_nhan: "A", ngay_vao_vien: "2026-11-01" };
  it("importBenhAnExcel: khác khoa / thiếu khoa bị từ chối", async () => {
    expect(await importBenhAnExcel([{ ...ba, khoa_dieu_tri_id: K2 }])).toEqual({ success: false, error: OUT });
    expect(await importBenhAnExcel([ba])).toEqual({ success: false, error: OUT });
  });
  it("importBenhAnExcel: restriction none bị từ chối", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await importBenhAnExcel([{ ...ba, khoa_dieu_tri_id: K1 }])).toEqual({ success: false, error: OUT });
  });
  it("importViSinhExcel: thiếu khoa_yeu_cau_id với restriction khoa bị từ chối", async () => {
    const r = await importViSinhExcel([{ ma_benh_an: "BA1" } as never]);
    expect(r).toEqual({ success: false, error: OUT });
  });
  it("previewViSinhImportAlerts: restriction none bị từ chối; BA ngoài khoa bị lọc", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await previewViSinhImportAlerts([])).toEqual({ success: false, error: OUT });
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    mocks.inScope.mockResolvedValue(false);
    const r = await previewViSinhImportAlerts([
      { ma_benh_an: "BA1", ngay_lay_mau: "2026-11-02", loai_benh_pham: "Máu", ma_xet_nghiem: "X1" },
    ]);
    expect(r).toEqual({ success: true, alertsByXn: {} });
  });
});

describe("NKBV phân tích vi sinh — phạm vi khoa", () => {
  it("id không phải uuid bị từ chối", async () => {
    const r = await markNkbvViSinhKhongDuTc({ vi_sinh_id: "abc" });
    expect(r.success).toBe(false);
  });
  it("XN thuộc BA ngoài khoa bị từ chối, không ghi", async () => {
    mocks.viSinhRow.mockResolvedValue({ data: { id: VS, metadata: {}, ma_benh_an: "BA9" }, error: null });
    mocks.inScope.mockResolvedValue(false);
    const r = await skipNkbvViSinhAnalysis({ vi_sinh_id: VS, reason: "x" });
    expect(r).toEqual({ success: false, error: OUT });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("XN thiếu ma_benh_an bị từ chối (fail-closed)", async () => {
    mocks.viSinhRow.mockResolvedValue({ data: { id: VS, metadata: {}, ma_benh_an: null }, error: null });
    const r = await markNkbvViSinhKhongDuTc({ vi_sinh_id: VS });
    expect(r).toEqual({ success: false, error: OUT });
  });
  it("đúng khoa thì qua", async () => {
    mocks.viSinhRow.mockResolvedValue({ data: { id: VS, metadata: {}, ma_benh_an: "BA1" }, error: null });
    const r = await skipNkbvViSinhAnalysis({ vi_sinh_id: VS, reason: "x" });
    expect(r).toEqual({ success: true });
  });
});

describe("upsertNkbvBaNgayKhoa — kiểm khoa", () => {
  it("khoa ngoài phạm vi bị từ chối", async () => {
    const r = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA1", ngay_lich: "2026-11-02", khoa_id: K2 });
    expect(r).toEqual({ success: false, error: OUT });
  });
  it("khoa không tồn tại bị từ chối", async () => {
    mocks.restriction.mockResolvedValue({ kind: "all" });
    mocks.validateKhoa.mockRejectedValue(new Error("Khoa: id không thuộc Danh mục Khoa phòng"));
    const r = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA1", ngay_lich: "2026-11-02", khoa_id: K2 });
    expect(r.success).toBe(false);
  });
  it("xóa ô khoa ngày vào viện reset khoa_dieu_tri_id", async () => {
    mocks.restriction.mockResolvedValue({ kind: "all" });
    const r = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA1", ngay_lich: "2026-11-01", khoa_id: null });
    expect(r.success).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ khoa_dieu_tri_id: null }));
  });
});
