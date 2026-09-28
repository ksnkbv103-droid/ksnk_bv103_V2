import { describe, expect, it } from "vitest";
import {
  buildClearUsedClinicallyMetadataPatch,
  buildUsedClinicallyMetadataPatch,
  isCssdCycleUsedClinically,
  parseUsedClinicallyFromMetadata,
  passesScPickerWhitelist,
  resolveScPickerWorkflowId,
  SC_PICKER_STATIONS,
} from "./cssd-used-clinically";

describe("cssd-used-clinically Domain 23 A", () => {
  it("requires flag + actor + timestamp — ma_ca_mo_id alone is not used", () => {
    expect(isCssdCycleUsedClinically({ maCaMoId: "CA-1" })).toBe(false);
    expect(isCssdCycleUsedClinically({ metadata: { ma_ca_mo_id: "CA-1" } })).toBe(false);
    expect(
      isCssdCycleUsedClinically({
        usedClinically: true,
        usedClinicallyAt: "2026-09-28T01:00:00.000Z",
        usedClinicallyBy: "user-1",
      }),
    ).toBe(true);
    expect(
      isCssdCycleUsedClinically({
        usedClinically: true,
        usedClinicallyAt: "",
        usedClinicallyBy: "user-1",
      }),
    ).toBe(false);
    expect(
      isCssdCycleUsedClinically({
        metadata: {
          used_clinically: true,
          used_clinically_at: "2026-09-28T01:00:00.000Z",
          used_clinically_by: "ns-1",
          used_clinically_source: "CLINICAL",
          ma_ca_mo_id: "CA-9",
        },
      }),
    ).toBe(true);
  });

  it("builds event patch with actor + timestamp; optional ca mổ companion", () => {
    const patch = buildUsedClinicallyMetadataPatch({
      actor: "auth-1",
      at: "2026-09-28T02:00:00.000Z",
      source: "CLINICAL",
      maCaMoId: "CA-12",
    });
    expect(patch).toEqual({
      used_clinically: true,
      used_clinically_at: "2026-09-28T02:00:00.000Z",
      used_clinically_by: "auth-1",
      used_clinically_source: "CLINICAL",
      ma_ca_mo_id: "CA-12",
    });
    expect(() => buildUsedClinicallyMetadataPatch({ actor: " ", source: "MANUAL" })).toThrow(/actor/i);
  });

  it("manual clear is still an explicit event", () => {
    const clear = buildClearUsedClinicallyMetadataPatch({
      actor: "auth-2",
      at: "2026-09-28T03:00:00.000Z",
    });
    expect(clear.used_clinically).toBe(false);
    expect(clear.used_clinically_cleared_by).toBe("auth-2");
    expect(isCssdCycleUsedClinically({ metadata: clear })).toBe(false);
  });

  it("gắn đúng một chu trình mở; nhiều chu trình phải chọn; luân chuyển không gắn", () => {
    const open = { id: "qt-open", ok: true };
    const used = { id: "qt-used", ok: false };
    expect(resolveScPickerWorkflowId({ candidates: [used, open] }).quyTrinhId).toBe("qt-open");
    expect(resolveScPickerWorkflowId({ explicitId: "qt-open", candidates: [used, open] }).quyTrinhId).toBe(
      "qt-open",
    );
    expect(resolveScPickerWorkflowId({ explicitId: "qt-used", candidates: [used, open] }).error).toMatch(/không còn mở/);
    expect(
      resolveScPickerWorkflowId({ candidates: [open, { id: "qt-2", ok: true }] }).error,
    ).toMatch(/nhiều chu trình/);
    expect(resolveScPickerWorkflowId({ candidates: [used], circulation: true })).toEqual({
      quyTrinhId: null,
      error: null,
    });
    expect(resolveScPickerWorkflowId({ candidates: [used] })).toEqual({ quyTrinhId: null, error: null });
  });

  it("SC picker whitelist: open ∧ tram∈6 ∧ ¬used (CAP_PHAT stays IN until used)", () => {
    expect(SC_PICKER_STATIONS).toContain("CAP_PHAT");
    expect(
      passesScPickerWhitelist({
        isActive: true,
        tramHienTai: "CAP_PHAT",
        metadata: {},
      }),
    ).toBe(true);
    expect(
      passesScPickerWhitelist({
        isActive: true,
        tramHienTai: "CAP_PHAT",
        metadata: {
          used_clinically: true,
          used_clinically_at: "2026-09-28T01:00:00.000Z",
          used_clinically_by: "u1",
        },
      }),
    ).toBe(false);
    expect(passesScPickerWhitelist({ isActive: false, tramHienTai: "QC" })).toBe(false);
    expect(passesScPickerWhitelist({ isActive: true, tramHienTai: "KHO" })).toBe(false);
  });

  it("parses metadata without inventing used from ca mổ", () => {
    const s = parseUsedClinicallyFromMetadata({ ma_ca_mo_id: "CA-1" });
    expect(s.usedClinically).toBe(false);
    expect(s.maCaMoId).toBe("CA-1");
  });
});
