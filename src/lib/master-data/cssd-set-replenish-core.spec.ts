import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { replenishSetInstrumentCore, returnSetInstrumentToKhoCore } from "./cssd-set-replenish-core";

describe("kho dự phòng atomic", () => {
  it("bổ sung gọi RPC và không đọc-sửa-ghi so_luong_kho_du_phong", async () => {
    const rpc = vi.fn(async () => ({ data: { success: true }, error: null }));
    const client = {
      rpc,
      from() {
        throw new Error("không được cập nhật kho từ TypeScript");
      },
    };
    const res = await replenishSetInstrumentCore(client as never, {
      loaiDungCuId: "loai-1",
      boDungCuId: "bo-1",
      quantity: 2,
    });
    expect(res.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "rpc_cssd_apply_instrument_ledger",
      expect.objectContaining({
        p_loai_giao_dich: "BO_SUNG",
        p_so_luong_thay_doi: 2,
      }),
    );
  });

  it("trừ kho không âm — RPC từ chối thì không ghi và trả lỗi tiếng Việt", async () => {
    const rpc = vi.fn(async () => ({
      data: { success: false, message: "Kho dự phòng không đủ (hiện có 1)." },
      error: null,
    }));
    const writes: string[] = [];
    const client = {
      rpc,
      from(table: string) {
        writes.push(table);
        return { update: () => ({ eq: async () => ({ error: null }) }) };
      },
    };
    const res = await replenishSetInstrumentCore(client as never, {
      loaiDungCuId: "loai-1",
      boDungCuId: "bo-1",
      quantity: 5,
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Kho dự phòng không đủ (hiện có 1).");
    expect(writes).toEqual([]);
  });

  it("trả kho cũng đi qua RPC, số lượng âm trên bộ", async () => {
    const rpc = vi.fn(async () => ({ data: { success: true }, error: null }));
    const res = await returnSetInstrumentToKhoCore({ rpc, from() { throw new Error("rmw"); } } as never, {
      loaiDungCuId: "loai-1",
      boDungCuId: "bo-1",
      quantity: 1,
    });
    expect(res.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "rpc_cssd_apply_instrument_ledger",
      expect.objectContaining({ p_loai_giao_dich: "NHAP_KHO", p_so_luong_thay_doi: -1 }),
    );
  });

  it("SQL trừ kho bằng UPDATE có điều kiện, không gán giá trị đã đọc", () => {
    const sql = readFileSync("supabase/migrations/20260925150000_cssd_ledger_atomic.sql", "utf8");
    expect(sql).toContain("so_luong_kho_du_phong = so_luong_kho_du_phong - v_abs");
    expect(sql).toContain("so_luong_kho_du_phong >= v_abs");
    expect(sql).not.toContain("so_luong_kho_du_phong = v_reserve - v_abs");
    expect(sql).toContain("SELECT SUM(tx.so_luong_thay_doi)::integer");
    expect(sql).toContain("SELECT ct.so_luong");
  });
});
