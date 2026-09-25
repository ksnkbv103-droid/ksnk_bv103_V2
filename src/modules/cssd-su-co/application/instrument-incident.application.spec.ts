import { describe, expect, it, vi } from "vitest";
import { applyInstrumentIncidentLedger } from "./instrument-incident.application";

describe("applyInstrumentIncidentLedger write path", () => {
  it("BAO_HONG uses one rpc_cssd_apply_instrument_lines call (note + ledger)", async () => {
    const rpc = vi.fn(async () => ({ data: { success: true, su_co_id: "su-co-1" }, error: null }));
    const client = {
      rpc,
      from() {
        throw new Error("direct table write forbidden — note and ledger stay in the RPC");
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

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "rpc_cssd_apply_instrument_lines",
      expect.objectContaining({
        p_su_co_id: "su-co-1",
        p_lines: [
          expect.objectContaining({
            loai_giao_dich: "BAO_HONG",
            so_luong_thay_doi: -1,
            chi_tiet_id: "ct-1",
            issue_type: "HONG",
            ghi_chu: "gãy",
          }),
        ],
      }),
    );
  });

  it("BAO_MAT also routes via the same batch RPC", async () => {
    const rpc = vi.fn(async () => ({ data: { success: true }, error: null }));
    const client = { rpc, from() { throw new Error("direct write"); } };

    await applyInstrumentIncidentLedger(client as never, "su-co-2", {
      typeId: "INSTRUMENT_MISSING",
      chiTietId: "ct-2",
      loaiDungCuId: "loai-1",
      boDungCuId: "bo-1",
      quantity: 1,
    });

    expect(rpc).toHaveBeenCalledWith(
      "rpc_cssd_apply_instrument_lines",
      expect.objectContaining({
        p_lines: [expect.objectContaining({ loai_giao_dich: "BAO_MAT", issue_type: "MAT", so_luong_thay_doi: -1 })],
      }),
    );
  });
});
