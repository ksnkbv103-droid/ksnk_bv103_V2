import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { applySetReconcilePhysicalLines } from "./set-reconcile-ledger.application";
import type { SetReconcileLineInput } from "@/lib/domain/cssd-set-reconcile";

const hong = (ten: string, id: string): SetReconcileLineInput => ({
  chiTietId: id,
  loaiDungCuId: "loai-" + id,
  tenDungCuLe: ten,
  soLuongChuan: 2,
  soLuongThucTe: 2,
  soLuongDem: 1,
  kind: "HONG",
});

describe("applySetReconcilePhysicalLines batch", () => {
  it("gửi một RPC cho nhiều dòng và lần hai không ghi thêm khi server idempotent", async () => {
    const calls: unknown[] = [];
    const inserts: unknown[] = [];
    const rpc = vi.fn(async (_name: string, args: { p_lines: unknown[] }) => {
      calls.push(args.p_lines);
      const idempotent = calls.length > 1;
      return { data: { success: true, idempotent, su_co_id: "su-1" }, error: null };
    });
    const client = {
      rpc,
      from(table: string) {
        return {
          insert: async (row: unknown) => {
            inserts.push({ table, row });
            return { error: null };
          },
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      },
    };

    const lines = [hong("Kẹp", "a"), hong("Kéo", "b")];
    const args = {
      boDungCuId: "bo-1",
      headerNote: "kiểm",
      lines,
      door: "reconcile" as const,
    };
    await applySetReconcilePhysicalLines(client as never, "su-1", args);
    await applySetReconcilePhysicalLines(client as never, "su-1", args);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][0]).toBe("rpc_cssd_apply_instrument_lines");
    expect(calls[0]).toHaveLength(2);
    expect(calls[1]).toHaveLength(2);
    expect(inserts).toHaveLength(0);
  });

  it("SQL batch không áp lại cùng su_co_id", () => {
    const sql = readFileSync("supabase/migrations/20260925150000_cssd_ledger_atomic.sql", "utf8");
    expect(sql).toContain("CSSD_LEDGER_APPLIED");
    expect(sql).toContain("g.su_co_id = p_su_co_id");
    expect(sql).toContain("'idempotent', true");
    expect(sql).toContain("ngay_kiem_ke_gan_nhat");
    expect(sql).not.toContain(
      "COALESCE(SUM(tx.so_luong_thay_doi), 0)::integer + COALESCE(ct.so_luong, 0)::integer",
    );
  });
});
