import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  fetchAll: vi.fn(),
  tramPatch: vi.fn(),
  inserts: [] as Array<Record<string, unknown>>,
  insertError: null as null | { message: string },
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/fetch-all-range", () => ({ fetchAllRangeRows: mocks.fetchAll }));
vi.mock("../lib/cssd-tram-persist", () => ({ buildQuyTrinhTramPatch: mocks.tramPatch }));
vi.mock("./cssd-action-common", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
  mapFkError: (m: string) => m,
  revalidateCssdInventorySurfaces: vi.fn(),
  revalidateCssdWorkflowSurfaces: vi.fn(),
  appendQuyTrinhException: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(),
  createAdminSupabaseClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        mocks.inserts.push(row);
        return { error: mocks.insertError };
      },
    }),
  }),
}));

import { importCSSDData } from "./cssd-write.actions";

describe("importCSSDData: nạp Excel kho chỉ tạo shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inserts.length = 0;
    mocks.insertError = null;
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.fetchAll.mockResolvedValue([{ id: "id-1", ma_qr_quy_trinh: "QR-OLD" }]);
    mocks.tramPatch.mockResolvedValue({ tram_hien_tai: "TIEP_NHAN" });
  });

  it("mã mới: insert shell ở TIEP_NHAN, active, chỉ có mã + patch trạm", async () => {
    const r = await importCSSDData([{ ma_vach_qr: "qr-new" }]);
    expect(r).toMatchObject({ success: true, audit: { insertCount: 1, skipCount: 0, ignoredFieldRows: 0 } });
    expect(mocks.tramPatch).toHaveBeenCalledWith(expect.anything(), "TIEP_NHAN");
    expect(mocks.inserts).toHaveLength(1);
    expect(mocks.inserts[0]).toMatchObject({ ma_qr_quy_trinh: "QR-NEW", tram_hien_tai: "TIEP_NHAN", is_active: true });
    expect(Object.keys(mocks.inserts[0]).sort()).toEqual(
      ["is_active", "ma_qr_quy_trinh", "tram_hien_tai", "updated_at"],
    );
  });

  it("mã đã có (không phân biệt hoa thường) và mã trùng trong file: bỏ qua, không insert", async () => {
    const r = await importCSSDData([
      { ma_vach_qr: "qr-old" },
      { ma_vach_qr: "QR-X" },
      { ma_vach_qr: "qr-x" },
    ]);
    expect(r).toMatchObject({ success: true, audit: { insertCount: 1, skipCount: 2 } });
    expect(mocks.inserts.map((i) => i.ma_qr_quy_trinh)).toEqual(["QR-X"]);
    expect((r as { warning?: string }).warning).toContain("2 mã đã có bị bỏ qua");
  });

  it("cột trạm/lô/HSD/tình trạng/cờ đỏ bị bỏ qua, đếm số dòng, không đi vào insert", async () => {
    const r = await importCSSDData([
      { ma_vach_qr: "A1", trang_thai_hien_tai: "VO_KHUAN" },
      { ma_vach_qr: "A2", tinh_trang: "Bình thường", han_su_dung: "2027-01-01" },
      { ma_vach_qr: "A3", lo_tiet_khuan_id: "lo-1" },
      { ma_vach_qr: "A4", is_red_alert: true },
      { ma_vach_qr: "A5", is_red_alert: false, han_su_dung: "  " },
      { ma_vach_qr: "A6" },
    ]);
    expect(r).toMatchObject({ success: true, audit: { insertCount: 6, ignoredFieldRows: 4 } });
    expect((r as { warning?: string }).warning).toContain("4 dòng có cột trạm/lô/HSD/tình trạng/cờ đỏ bị bỏ qua");
    for (const ins of mocks.inserts) {
      expect(ins).not.toHaveProperty("han_su_dung");
      expect(ins).not.toHaveProperty("lo_tiet_khuan_id");
      expect(ins).not.toHaveProperty("tinh_trang");
      expect(ins).not.toHaveProperty("is_red_alert");
      expect(ins.tram_hien_tai).toBe("TIEP_NHAN");
    }
  });

  it("alias ma_qr_quy_trinh và ma_trang_thai_hien_tai được nhận (cột trạng thái vẫn bị bỏ qua)", async () => {
    const r = await importCSSDData([{ ma_qr_quy_trinh: "alias-1", ma_trang_thai_hien_tai: "VO_KHUAN" }]);
    expect(r).toMatchObject({ success: true, audit: { insertCount: 1, ignoredFieldRows: 1 } });
    expect(mocks.inserts[0].ma_qr_quy_trinh).toBe("ALIAS-1");
  });

  it("dryRun: đếm shell mới, không insert", async () => {
    const r = await importCSSDData([{ ma_vach_qr: "n1" }, { ma_vach_qr: "qr-old" }], { dryRun: true });
    expect(r).toMatchObject({ success: true, dryRun: true, audit: { insertCount: 1, skipCount: 1 } });
    expect(mocks.inserts).toHaveLength(0);
    expect(mocks.tramPatch).not.toHaveBeenCalled();
  });

  it("softDeleteMissing=true bị chặn, không đọc DB", async () => {
    const r = await importCSSDData([{ ma_vach_qr: "n1" }], { softDeleteMissing: true });
    expect(r).toMatchObject({ success: false });
    expect(mocks.fetchAll).not.toHaveBeenCalled();
    expect(mocks.inserts).toHaveLength(0);
  });

  it("dòng thiếu mã: báo lỗi kèm số dòng Excel, không insert dòng đó", async () => {
    const r = await importCSSDData([{ __excel_row__: 7, ma_vach_qr: "" }]);
    expect(r).toMatchObject({ success: false, errorTotal: 1 });
    expect((r as { error: string }).error).toContain("Dòng 7");
    expect(mocks.inserts).toHaveLength(0);
  });

  it("lỗi ghi DB: trả success=false kèm mã", async () => {
    mocks.insertError = { message: "boom" };
    const r = await importCSSDData([{ ma_vach_qr: "n1" }]);
    expect(r).toMatchObject({ success: false });
    expect((r as { error: string }).error).toContain("N1: boom");
  });

  it("không quyền import: trả success=false, không chạm DB", async () => {
    mocks.verifyPermission.mockRejectedValue(new Error("Không có quyền"));
    const r = await importCSSDData([{ ma_vach_qr: "n1" }]);
    expect(r).toEqual({ success: false, error: "Không có quyền" });
    expect(mocks.fetchAll).not.toHaveBeenCalled();
  });
});
