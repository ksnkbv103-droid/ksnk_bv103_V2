import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  loMe: { data: { ma_lo_tiet_khuan: "L1", ket_qua_test: true } as unknown },
  qt: {} as Record<string, unknown>,
  ledger: { ok: true } as unknown,
  execScan: vi.fn(),
  updateResult: { data: [{ id: "x" }], error: null } as unknown,
}));

const QT_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "cssd_fact_lo_tiet_khuan") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => mocks.loMe }) }) };
      }
      return {
        update: (patch: unknown) => {
          mocks.update(patch);
          return { eq: () => ({ is: () => ({ select: async () => mocks.updateResult }) }) };
        },
      };
    },
    rpc: async () => ({ error: null }),
  }),
  createServerSupabaseUserClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u", email: "a@b.c" } } }) } }),
}));
vi.mock("./cssd-action-common", () => ({ revalidateCssdWorkflowSurfaces: vi.fn() }));
vi.mock("../workflow/application/cssd-workflow-application", () => ({ executeWorkflowStationScan: mocks.execScan }));
vi.mock("../workflow/application/cssd-asset-ledger", () => ({ assertLedgerDuChoCapPhat: async () => mocks.ledger }));
vi.mock("@/lib/domain/cssd-pack-issuance", () => ({ assertPackIssuable: () => ({ ok: true }) }));
vi.mock("../helpers/pack-batch-release-gate", () => ({ loadPackBatchReleaseGate: async () => null }));
vi.mock("@/lib/domain/cssd-bo-ma", () => ({ isRejectedLegacyHexBoQr: () => false, isCssdUnifiedBoMa: () => true }));
vi.mock("../shared/application/cssd-qr-hub", () => ({
  resolveCssdCodeWithClient: async (_c: unknown, code: string) => ({ code, targetType: "BO" }),
}));
vi.mock("../shared/application/cssd-bo-bootstrap", () => ({ bootstrapCssdQuyTrinhFromMaBo: vi.fn() }));
vi.mock("@/lib/cssd-server-gates", () => ({ verifyCssdWorkflowEdit: vi.fn(async () => undefined) }));
vi.mock("../shared/application/cssd-workflow-resolve", () => ({ fetchActiveQuyTrinhByScanCode: async () => mocks.qt }));
vi.mock("../shared/application/cssd-operator-resolve", () => ({ resolveCssdOperatorNhanSuId: async () => null }));
vi.mock("@/modules/cssd-su-co/application/recall-receive.application", () => ({
  tryReceiveChoThuVeAtTiepNhan: async () => ({ handled: false }),
}));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: async () => null }));

import { scanQR } from "./cssd-scan.actions";

describe("scanQR CAP_PHAT issuanceOnly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.qt = {
      id: QT_ID,
      ma_trang_thai_hien_tai: "CAP_PHAT",
      lo_tiet_khuan_id: "lo-1",
      ten_bo: "Bộ A",
      thoi_gian_cap_phat: null,
    };
    mocks.loMe = { data: { ma_lo_tiet_khuan: "L1", ket_qua_test: true } };
    mocks.ledger = { ok: true };
    mocks.updateResult = { data: [{ id: QT_ID }], error: null };
  });

  it("mẻ chưa có kết quả nội kiểm thì không ghi", async () => {
    mocks.loMe = { data: { ma_lo_tiet_khuan: "L1", ket_qua_test: null } };
    await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/CHƯA CÓ KẾT QUẢ NỘI KIỂM/);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("mẻ không đạt thì không ghi", async () => {
    mocks.loMe = { data: { ma_lo_tiet_khuan: "L1", ket_qua_test: false } };
    await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/KHÔNG ĐẠT/);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("sổ cấu phần không đủ thì không ghi", async () => {
    mocks.ledger = { ok: false, message: "Thiếu cấu phần" };
    await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/Thiếu cấu phần/);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("UPDATE 0 hàng (đã cấp phát đồng thời) trả lỗi rõ ràng", async () => {
    mocks.updateResult = { data: [], error: null };
    await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/đã được cấp phát/);
  });

  it("đủ gate thì ghi và trả issuanceOnly", async () => {
    const res = await scanQR("B01.SET.01", "CAP_PHAT");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect((res as { issuanceOnly?: boolean }).issuanceOnly).toBe(true);
  });

  it("khoa_nhan_id không phải uuid bị từ chối trước mọi thao tác", async () => {
    await expect(scanQR("B01.SET.01", "CAP_PHAT", { khoa_nhan_id: "abc" })).rejects.toThrow(/khoa_nhan_id/);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
