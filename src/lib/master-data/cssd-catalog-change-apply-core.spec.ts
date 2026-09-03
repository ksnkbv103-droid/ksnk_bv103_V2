import { describe, expect, it } from "vitest";
import { executeCatalogApplyOps } from "./cssd-catalog-change-apply-core";
import type { CatalogApplyOp } from "@/lib/domain/cssd-catalog-change";

type Call = { table: string; method: string; payload?: unknown; eq?: [string, string] };

function mockClient(calls: Call[], failTable?: string) {
  return {
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, method: "insert", payload });
          return { error: failTable === table ? { message: "insert fail" } : null };
        },
        update(payload: unknown) {
          return {
            eq(col: string, val: string) {
              calls.push({ table, method: "update", payload, eq: [col, val] });
              return { error: failTable === table ? { message: "update fail" } : null };
            },
          };
        },
      };
    },
  };
}

describe("executeCatalogApplyOps", () => {
  it("ghi insert/update/soft-delete master và cặp sổ DIEU_CHUYEN", async () => {
    const calls: Call[] = [];
    const ops: CatalogApplyOp[] = [
      { op: "insert", table: "cssd_dm_loai_dung_cu", row: { ma_loai: "DC-K", ten_loai: "Kéo" } },
      { op: "update", table: "cssd_dm_bo_dung_cu_chi_tiet", id: "ct-1", row: { so_luong: 3 } },
      { op: "soft_delete", table: "cssd_dm_bo_dung_cu", id: "b-old" },
      {
        op: "ledger",
        loaiGiaoDich: "DIEU_CHUYEN",
        loaiDungCuId: "l1",
        boDungCuId: "b1",
        boDungCuIdDen: "b2",
        soLuong: 2,
        ghiChu: "Chuyển",
      },
    ];
    const r = await executeCatalogApplyOps(mockClient(calls) as never, ops);
    expect(r.success).toBe(true);
    expect(calls[0]).toMatchObject({ table: "cssd_dm_loai_dung_cu", method: "insert" });
    expect(calls[1]).toMatchObject({
      table: "cssd_dm_bo_dung_cu_chi_tiet",
      method: "update",
      eq: ["id", "ct-1"],
    });
    expect(calls[2]).toMatchObject({
      table: "cssd_dm_bo_dung_cu",
      method: "update",
      payload: expect.objectContaining({ is_active: false }),
    });
    expect(calls[3]).toMatchObject({ table: "cssd_fact_kho_giao_dich", method: "insert" });
    const ledgerRows = calls[3].payload as Array<{ so_luong_thay_doi: number; bo_dung_cu_id: string }>;
    expect(ledgerRows).toHaveLength(2);
    expect(ledgerRows[0].so_luong_thay_doi).toBe(-2);
    expect(ledgerRows[1].so_luong_thay_doi).toBe(2);
    expect(ledgerRows[1].bo_dung_cu_id).toBe("b2");
  });

  it("không ghi bảng ngoài allowlist master", async () => {
    const r = await executeCatalogApplyOps(mockClient([]) as never, [
      { op: "insert", table: "mdm_nhan_su", row: { ten: "x" } },
    ]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/không hợp lệ/);
  });
});
