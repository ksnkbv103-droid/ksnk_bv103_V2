import { describe, expect, it, vi } from "vitest";
import { applySetReconcilePhysicalLines } from "./set-reconcile-ledger.application";
import type { SetReconcileLineInput } from "@/lib/domain/cssd-set-reconcile";
import { readMigrationSql } from "@/lib/testing/migration-file";

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
    const sql = readMigrationSql("cssd_ledger_atomic");
    expect(sql).toContain("CSSD_LEDGER_APPLIED");
    expect(sql).toContain("g.su_co_id = p_su_co_id");
    expect(sql).toContain("'idempotent', true");
    expect(sql).toContain("ngay_kiem_ke_gan_nhat");
    expect(sql).not.toContain(
      "COALESCE(SUM(tx.so_luong_thay_doi), 0)::integer + COALESCE(ct.so_luong, 0)::integer",
    );
  });

  it("Approach A migrate ensures chi_tiet on BO_SUNG / DIEU_CHUYEN dest", () => {
    const sql = readMigrationSql("cssd_ledger_ensure_chi_tiet_on_move");
    expect(sql).toContain("fn_cssd_ensure_chi_tiet_for_ledger");
    expect(sql).toContain("fn_cssd_apply_instrument_ledger_tx");
    expect(sql).toContain("so_luong");
    expect(sql).toContain("BO_SUNG");
    expect(sql).toContain("DIEU_CHUYEN");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("unique_violation");
    expect(sql).not.toContain("DROP TABLE");
  });
});
