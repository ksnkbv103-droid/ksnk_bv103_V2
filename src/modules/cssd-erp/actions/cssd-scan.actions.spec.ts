import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  loMe: { data: { ma_lo_tiet_khuan: "L1", ket_qua_test: true } as unknown },
  qt: {} as Record<string, unknown>,
  ledger: { ok: true } as unknown,
  execScan: vi.fn(),
  updateResult: { data: [{ id: "x" }], error: null } as unknown,
  rpc: vi.fn(),
  recv: vi.fn(async (..._a: unknown[]) => ({ handled: false }) as unknown),
  operatorId: "ns-op-01" as string | null,
}));

const QT_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "cssd_fact_lo_tiet_khuan") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => mocks.loMe }) }) };
      }
      if (table === "cssd_fact_quy_trinh") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { metadata: { thu_hoi: { trang_thai: "CHO_THU_VE" } } } }) }),
          }),
        };
      }
      return {
        update: (patch: unknown) => {
          mocks.update(patch);
          return { eq: () => ({ is: () => ({ select: async () => mocks.updateResult }) }) };
        },
      };
    },
    rpc: mocks.rpc,
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
vi.mock("../shared/application/cssd-operator-resolve", () => ({ resolveCssdOperatorNhanSuId: async () => mocks.operatorId }));
vi.mock("@/modules/cssd-su-co/application/recall-receive.application", () => ({
  tryReceiveChoThuVeAtTiepNhan: (...a: unknown[]) => mocks.recv(...a),
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
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
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

  it("DA_CAP_PHAT từ RPC (cấp phát đồng thời) trả lỗi rõ ràng", async () => {
    mocks.rpc.mockResolvedValue({
      data: { success: false, code: "DA_CAP_PHAT", message: "Bộ dụng cụ đã được cấp phát trước đó (hoặc vừa được người khác cấp phát). Tải lại để xem." },
      error: null,
    });
    await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/đã được cấp phát/);
  });

  it("KHOA_NHAN_KHONG_TON_TAI từ RPC trả lỗi rõ ràng", async () => {
    mocks.rpc.mockResolvedValue({
      data: { success: false, code: "KHOA_NHAN_KHONG_TON_TAI", message: "Khoa nhận không tồn tại trong danh mục." },
      error: null,
    });
    await expect(
      scanQR("B01.SET.01", "CAP_PHAT", { khoa_nhan_id: "22222222-2222-4222-8222-222222222222" }),
    ).rejects.toThrow(/Khoa nhận không tồn tại/);
  });

  it("RPC RAISE (error, đã hoàn tác) được báo là lỗi hệ thống", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "guard_pack_issuance: gói không an toàn" } });
    await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/Lỗi hệ thống: guard_pack_issuance/);
  });

  it("đủ gate thì gọi rpc_cssd_cap_phat_commit một lần và trả issuanceOnly", async () => {
    const res = await scanQR("B01.SET.01", "CAP_PHAT", {
      khoa_nhan_id: "22222222-2222-4222-8222-222222222222",
      ma_ca_mo_id: "CM1",
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("rpc_cssd_cap_phat_commit", {
      p_quy_trinh_id: QT_ID,
      p_nguoi_cap_phat_id: "ns-op-01",
      p_khoa_nhan_id: "22222222-2222-4222-8222-222222222222",
      p_ma_ca_mo_id: "CM1",
    });
    expect((res as { issuanceOnly?: boolean }).issuanceOnly).toBe(true);
  });

  it("tài khoản chưa gắn hồ sơ nhân sự: chặn cấp phát, không gọi RPC (CSSD-007)", async () => {
    mocks.operatorId = null;
    try {
      await expect(scanQR("B01.SET.01", "CAP_PHAT")).rejects.toThrow(/chưa gắn hồ sơ nhân sự/);
      expect(mocks.rpc).not.toHaveBeenCalled();
    } finally {
      mocks.operatorId = "ns-op-01";
    }
  });

  it("đã cấp phát: quét lại chỉ in phiếu, không gọi cap_phat_commit", async () => {
    mocks.qt = { ...mocks.qt, thoi_gian_cap_phat: "2026-11-05T01:00:00Z" };
    const res = await scanQR("B01.SET.01", "CAP_PHAT");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect((res as { issuanceOnly?: boolean }).issuanceOnly).toBe(true);
  });

  it("khoa_nhan_id không phải uuid bị từ chối trước mọi thao tác", async () => {
    await expect(scanQR("B01.SET.01", "CAP_PHAT", { khoa_nhan_id: "abc" })).rejects.toThrow(/khoa_nhan_id/);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("SC-01 pha 2: view không có metadata → đọc từ cssd_fact_quy_trinh trước khi nhận lại", async () => {
    mocks.qt = { id: QT_ID, ma_trang_thai_hien_tai: "CAP_PHAT", ten_bo: "Bộ A" };
    mocks.recv.mockResolvedValueOnce({ handled: true, newQuyTrinhId: "new-1" });
    const r = await scanQR("B01.SET.01", "TIEP_NHAN");
    const arg = mocks.recv.mock.calls[0][1] as { quyTrinh: { metadata: unknown } };
    expect(arg.quyTrinh.metadata).toEqual({ thu_hoi: { trang_thai: "CHO_THU_VE" } });
    expect(r).toMatchObject({ recallReceive: true, quyTrinhId: "new-1" });
  });
  it("CSSD-026: nhận lại thu hồi dùng resolver nhân sự (không phụ thuộc getActorNhanSuId)", async () => {
    mocks.qt = { id: QT_ID, ma_trang_thai_hien_tai: "CAP_PHAT", ten_bo: "Bộ A" };
    mocks.recv.mockResolvedValueOnce({ handled: true, newQuyTrinhId: "new-1" });
    await scanQR("B01.SET.01", "TIEP_NHAN");
    const arg = mocks.recv.mock.calls[0][1] as { operatorNhanSuId: string | null };
    expect(arg.operatorNhanSuId).toBe("ns-op-01");
  });
  it("CSSD-022: nhận bộ thành công nhưng chưa cập nhật phiếu sự cố thì trả warning", async () => {
    mocks.qt = { id: QT_ID, ma_trang_thai_hien_tai: "CAP_PHAT", ten_bo: "Bộ A" };
    mocks.recv.mockResolvedValueOnce({ handled: true, newQuyTrinhId: "new-1", incidentPatchFailed: true });
    const r = await scanQR("B01.SET.01", "TIEP_NHAN");
    expect(r).toMatchObject({
      recallReceive: true,
      warning: "Đã nhận bộ, chưa cập nhật được phiếu sự cố",
    });
  });
});
