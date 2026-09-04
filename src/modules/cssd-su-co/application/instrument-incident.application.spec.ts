import { describe, expect, it, vi } from "vitest";
import { applyInstrumentIncidentLedger } from "./instrument-incident.application";

describe("applyInstrumentIncidentLedger write path", () => {
  it("BAO_HONG uses rpc_cssd_apply_instrument_ledger (not direct insert)", async () => {
    const rpc = vi.fn(async () => ({ data: { success: true }, error: null }));
    const updates: unknown[] = [];
    const client = {
      rpc,
      from(table: string) {
        if (table === "v_cssd_bo_dung_cu_chi_tiet_realtime") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { so_luong_thuc_te: 3 },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "cssd_dm_bo_dung_cu_chi_tiet") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    ghi_chu: "",
                    bo_dung_cu_id: "bo-1",
                    loai_dung_cu_id: "loai-1",
                    so_luong: 3,
                  },
                  error: null,
                }),
              }),
            }),
            update: (row: unknown) => ({
              eq: async () => {
                updates.push(row);
                return { error: null };
              },
            }),
          };
        }
        if (table === "cssd_fact_kho_giao_dich") {
          return {
            insert: async () => {
              throw new Error("direct insert forbidden — must use RPC");
            },
          };
        }
        throw new Error("unexpected " + table);
      },
    };

    await applyInstrumentIncidentLedger(client as never, "su-co-1", {
      typeId: "INSTRUMENT_BROKEN",
      chiTietId: "ct-1",
      loaiDungCuId: "loai-1",
      boDungCuId: "bo-1",
      quyTrinhId: "qt-1",
      quantity: 1,
      note: "gãy",
    });

    expect(rpc).toHaveBeenCalledWith(
      "rpc_cssd_apply_instrument_ledger",
      expect.objectContaining({
        p_su_co_id: "su-co-1",
        p_loai_dung_cu_id: "loai-1",
        p_bo_dung_cu_id: "bo-1",
        p_loai_giao_dich: "BAO_HONG",
        p_so_luong_thay_doi: -1,
      }),
    );
    expect(updates.length).toBeGreaterThan(0);
  });

  it("BAO_MAT also routes via same RPC kind", async () => {
    const rpc = vi.fn(async () => ({ data: { success: true }, error: null }));
    const client = {
      rpc,
      from(table: string) {
        if (table === "v_cssd_bo_dung_cu_chi_tiet_realtime") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { so_luong_thuc_te: 2 },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "cssd_dm_bo_dung_cu_chi_tiet") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    ghi_chu: "",
                    bo_dung_cu_id: "bo-1",
                    loai_dung_cu_id: "loai-1",
                    so_luong: 2,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        throw new Error("unexpected " + table);
      },
    };

    await applyInstrumentIncidentLedger(client as never, "su-co-2", {
      typeId: "INSTRUMENT_MISSING",
      chiTietId: "ct-2",
      loaiDungCuId: "loai-1",
      boDungCuId: "bo-1",
      quantity: 1,
    });

    expect(rpc).toHaveBeenCalledWith(
      "rpc_cssd_apply_instrument_ledger",
      expect.objectContaining({ p_loai_giao_dich: "BAO_MAT", p_so_luong_thay_doi: -1 }),
    );
  });
});
