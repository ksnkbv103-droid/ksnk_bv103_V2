import { beforeEach, describe, expect, it, vi } from "vitest";

// NKBV-030: xóa ô khoa / ô dụng cụ theo ngày phải để lại nhật ký (fail-closed, ghi trước khi xóa).
// before = dòng bị xóa (mã bệnh án được phép, không thêm tên/mã người bệnh).
const m = vi.hoisted(() => ({
  order: [] as string[],
  audit: vi.fn(async (_input: Record<string, unknown>) => {}),
  deleted: [] as string[],
  benhAnUpdates: [] as Array<Record<string, unknown>>,
  sync: vi.fn(async (_ma: string) => {}),
  rows: {} as Record<string, Record<string, unknown> | null>,
  deleteError: null as { message: string } | null,
}));

vi.mock("@/lib/server-permission", () => ({ verifyAnyPermission: vi.fn(async () => undefined) }));
vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: async (input: Record<string, unknown>) => {
    m.order.push("audit");
    return m.audit(input);
  },
}));
vi.mock("../lib/nkbv-ba-ngay-sync", () => ({ syncNkbvPhieuFromBaNgay: m.sync }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn(async () => ({ kind: "all" })),
  isNkbvBenhAnInScope: vi.fn(async () => true),
  NKBV_OUT_OF_SCOPE_ERROR: "out",
}));
vi.mock("@/lib/master-data/validation", () => ({ normalizeAndValidateDmKhoaPhong: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(),
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      let mode: "read" | "delete" | "update" = "read";
      const chain: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (typeof prop === "symbol") return undefined;
            if (prop === "then") {
              return (res: (v: unknown) => void) => {
                if (mode === "delete") m.order.push("delete");
                res({ error: mode === "delete" ? m.deleteError : null });
              };
            }
            if (prop === "maybeSingle") {
              return async () => ({ data: m.rows[table] ?? null, error: null });
            }
            if (prop === "delete") {
              return () => {
                mode = "delete";
                m.deleted.push(table);
                return chain;
              };
            }
            if (prop === "update") {
              return (patch: Record<string, unknown>) => {
                mode = "update";
                if (table === "nkbv_fact_benh_an") m.benhAnUpdates.push(patch);
                return chain;
              };
            }
            return () => chain;
          },
        },
      );
      return chain;
    },
  }),
}));

import { toggleNkbvBaNgayDungCu, upsertNkbvBaNgayKhoa } from "./giam-sat-nkbv-ba-ngay.actions";

const KHOA_ROW = { id: "bk-1", ma_benh_an: "BA456", ngay_lich: "2026-11-03", khoa_id: "11111111-1111-4111-8111-111111111111" };
const DUNG_CU_ROW = { id: "dc-1", ma_benh_an: "BA456", ngay_lich: "2026-11-03", loai_dung_cu: "CVC" };

beforeEach(() => {
  vi.clearAllMocks();
  m.order.length = 0;
  m.deleted.length = 0;
  m.benhAnUpdates.length = 0;
  m.deleteError = null;
  m.rows = {
    nkbv_fact_benh_an: { ngay_vao_vien: "2026-11-01", ngay_ra_vien: null },
    nkbv_fact_ba_ngay_khoa: KHOA_ROW,
    nkbv_fact_ba_ngay_dung_cu: DUNG_CU_ROW,
  };
});

describe("NKBV-030: xóa ô khoa theo ngày ghi nhật ký", () => {
  it("ghi nhật ký fail-closed TRƯỚC khi xóa; before là dòng bị xóa", async () => {
    const res = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA456", ngay_lich: "2026-11-03", khoa_id: null });
    expect(res).toMatchObject({ success: true, khoa_id: null });
    expect(m.order).toEqual(["audit", "delete"]);
    expect(m.audit).toHaveBeenCalledTimes(1);
    const arg = m.audit.mock.calls[0]![0];
    expect(arg).toMatchObject({
      action: "NKBV_BA_NGAY_KHOA_DELETE",
      targetTable: "nkbv_fact_ba_ngay_khoa",
      targetId: "bk-1",
      failClosed: true,
    });
    expect(arg.before).toMatchObject({ ma_benh_an: "BA456", ngay_lich: "2026-11-03", khoa_id: KHOA_ROW.khoa_id });
    expect(m.benhAnUpdates).toHaveLength(0);
  });

  it("xóa ô ngày vào viện → nhật ký ghi rõ khoa_dieu_tri_id bị đặt về NULL", async () => {
    m.rows.nkbv_fact_ba_ngay_khoa = { ...KHOA_ROW, ngay_lich: "2026-11-01" };
    const res = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA456", ngay_lich: "2026-11-01", khoa_id: null });
    expect(res.success).toBe(true);
    expect(m.audit.mock.calls[0]![0].after).toMatchObject({ khoa_dieu_tri_id_cleared: true });
    expect(m.benhAnUpdates).toHaveLength(1);
  });

  it("ghi nhật ký lỗi → không xóa, không đổi khoa_dieu_tri_id, không đồng bộ phiếu, trả lỗi", async () => {
    m.audit.mockRejectedValueOnce(new Error("Ghi nhật ký quản trị thất bại: boom"));
    m.rows.nkbv_fact_ba_ngay_khoa = { ...KHOA_ROW, ngay_lich: "2026-11-01" };
    const res = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA456", ngay_lich: "2026-11-01", khoa_id: null });
    expect(res).toEqual({ success: false, error: "Ghi nhật ký quản trị thất bại: boom" });
    expect(m.deleted).toHaveLength(0);
    expect(m.benhAnUpdates).toHaveLength(0);
    expect(m.sync).not.toHaveBeenCalled();
  });

  it("ô khoa chưa có dòng → không ghi nhật ký, hành vi cũ (thành công)", async () => {
    m.rows.nkbv_fact_ba_ngay_khoa = null;
    const res = await upsertNkbvBaNgayKhoa({ ma_benh_an: "BA456", ngay_lich: "2026-11-03", khoa_id: null });
    expect(res.success).toBe(true);
    expect(m.audit).not.toHaveBeenCalled();
  });
});

describe("NKBV-030: bỏ tích dụng cụ theo ngày ghi nhật ký", () => {
  it("ghi nhật ký fail-closed TRƯỚC khi xóa; before là dòng bị xóa", async () => {
    const res = await toggleNkbvBaNgayDungCu({
      ma_benh_an: "BA456",
      ngay_lich: "2026-11-03",
      criteria_key: "device_central_line",
      on: false,
    });
    expect(res).toMatchObject({ success: true, on: false, loai: "CVC" });
    expect(m.order).toEqual(["audit", "delete"]);
    const arg = m.audit.mock.calls[0]![0];
    expect(arg).toMatchObject({
      action: "NKBV_BA_NGAY_DUNG_CU_DELETE",
      targetTable: "nkbv_fact_ba_ngay_dung_cu",
      targetId: "dc-1",
      failClosed: true,
    });
    expect(arg.before).toMatchObject({ ma_benh_an: "BA456", ngay_lich: "2026-11-03", loai_dung_cu: "CVC" });
  });

  it("ghi nhật ký lỗi → không xóa, không đồng bộ phiếu, trả lỗi", async () => {
    m.audit.mockRejectedValueOnce(new Error("Ghi nhật ký quản trị thất bại: boom"));
    const res = await toggleNkbvBaNgayDungCu({
      ma_benh_an: "BA456",
      ngay_lich: "2026-11-03",
      criteria_key: "device_central_line",
      on: false,
    });
    expect(res).toEqual({ success: false, error: "Ghi nhật ký quản trị thất bại: boom" });
    expect(m.deleted).toHaveLength(0);
    expect(m.sync).not.toHaveBeenCalled();
  });

  it("ô chưa có dòng → không ghi nhật ký, hành vi cũ (thành công)", async () => {
    m.rows.nkbv_fact_ba_ngay_dung_cu = null;
    const res = await toggleNkbvBaNgayDungCu({
      ma_benh_an: "BA456",
      ngay_lich: "2026-11-03",
      criteria_key: "device_central_line",
      on: false,
    });
    expect(res.success).toBe(true);
    expect(m.audit).not.toHaveBeenCalled();
  });

  it("bật tích (on=true) không xóa, không ghi nhật ký xóa", async () => {
    const res = await toggleNkbvBaNgayDungCu({
      ma_benh_an: "BA456",
      ngay_lich: "2026-11-03",
      criteria_key: "device_central_line",
      on: true,
    });
    expect(res.success).toBe(true);
    expect(m.audit).not.toHaveBeenCalled();
    expect(m.deleted).toHaveLength(0);
  });
});
