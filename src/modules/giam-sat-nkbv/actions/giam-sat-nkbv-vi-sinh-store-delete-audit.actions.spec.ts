import { beforeEach, describe, expect, it, vi } from "vitest";

// NKBV-031: xóa cứng xét nghiệm vi sinh phải để lại nhật ký (before không chứa danh tính bệnh nhân).
const m = vi.hoisted(() => ({
  audit: vi.fn(async (_input: Record<string, unknown>) => {}),
  deleteCalled: vi.fn(),
  deleteResult: vi.fn(async () => ({ error: null as { message: string } | null })),
  row: null as Record<string, unknown> | null,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({ verifyPermission: vi.fn(async () => undefined) }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: m.audit }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: vi.fn(async () => ({ kind: "all" })),
  NKBV_OUT_OF_SCOPE_ERROR: "out",
}));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(),
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      let deleting = false;
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.filter = () => chain;
      chain.eq = () => (deleting ? m.deleteResult() : chain);
      chain.limit = async () => ({ data: [] });
      chain.maybeSingle = async () => ({ data: table === "nkbv_fact_vi_sinh" ? m.row : null });
      chain.delete = () => {
        deleting = true;
        m.deleteCalled();
        return chain;
      };
      return chain;
    },
  }),
}));

import { deleteNkbvViSinhStoreRecordHard } from "./giam-sat-nkbv-vi-sinh-store.actions";

describe("NKBV-031: xóa cứng vi sinh ghi nhật ký", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.deleteResult.mockResolvedValue({ error: null });
    m.row = {
      id: "vs-1",
      ma_xet_nghiem: "XN001",
      ngay_lay_mau: "2026-11-10",
      loai_benh_pham: "Máu",
      tac_nhan: "E. coli",
      ket_qua_phan_loai: "DUONG_TINH",
      is_mdro: true,
      metadata: {},
      ho_ten_benh_nhan: "Nguyễn Văn A",
      ma_benh_nhan: "BN123",
      ma_benh_an: "BA456",
    };
  });

  it("xóa thành công → ghi nhật ký fail-closed TRƯỚC khi xóa, before không có danh tính", async () => {
    const order: string[] = [];
    m.audit.mockImplementationOnce(async () => {
      order.push("audit");
    });
    m.deleteCalled.mockImplementationOnce(() => {
      order.push("delete");
    });
    const res = await deleteNkbvViSinhStoreRecordHard("vs-1");
    expect(res).toEqual({ success: true });
    expect(order).toEqual(["audit", "delete"]);
    expect(m.audit).toHaveBeenCalledTimes(1);
    const arg = m.audit.mock.calls[0]![0];
    expect(arg).toMatchObject({
      action: "NKBV_VI_SINH_HARD_DELETE",
      targetTable: "nkbv_fact_vi_sinh",
      targetId: "vs-1",
      failClosed: true,
    });
    expect(arg.before).toMatchObject({ ma_xet_nghiem: "XN001", tac_nhan: "E. coli", is_mdro: true });
    const beforeJson = JSON.stringify(arg.before);
    expect(beforeJson).not.toContain("Nguyễn Văn A");
    expect(beforeJson).not.toContain("BN123");
    expect(beforeJson).not.toContain("BA456");
  });

  it("ghi nhật ký lỗi → không xóa, trả lỗi", async () => {
    m.audit.mockRejectedValueOnce(new Error("Ghi nhật ký quản trị thất bại: boom"));
    const res = await deleteNkbvViSinhStoreRecordHard("vs-1");
    expect(res).toEqual({ success: false, error: "Ghi nhật ký quản trị thất bại: boom" });
    expect(m.deleteCalled).not.toHaveBeenCalled();
  });

  it("không có dòng → trả lỗi, không xóa, không ghi nhật ký", async () => {
    m.row = null;
    const res = await deleteNkbvViSinhStoreRecordHard("vs-x");
    expect(res.success).toBe(false);
    expect(m.deleteCalled).not.toHaveBeenCalled();
    expect(m.audit).not.toHaveBeenCalled();
  });
});
