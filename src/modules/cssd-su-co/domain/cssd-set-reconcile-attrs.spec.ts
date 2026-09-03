import { describe, expect, it } from "vitest";
import { buildSetReconcileAttributePatch, isSetReconcileDraftAttr, parseSetReconcileSnapshot } from "./cssd-set-reconcile-attrs";

describe("cssd-set-reconcile-attrs", () => {
  it("stores snapshot and pending status when catalog lines exist", () => {
    const patch = buildSetReconcileAttributePatch({
      boDungCuId: "bo-1",
      status: "NONE",
      snapshot: {
        boDungCuId: "bo-1",
        maBo: "B01.SET.01",
        lines: [
          {
            tenDungCuLe: "Khay",
            soLuongChuan: 8,
            soLuongThucTe: 8,
            soLuongDem: 8,
            soLuongChuanDeXuat: 10,
            kind: "DOI_CHUAN",
            chiTietId: "11111111-1111-1111-1111-111111111111",
          },
        ],
      },
    });
    expect(patch.SET_RECONCILE_STATUS).toBe("BOM_PENDING");
    const snap = parseSetReconcileSnapshot(patch.SET_RECONCILE_SNAPSHOT);
    expect(snap?.lines[0]?.kind).toBe("DOI_CHUAN");
  });

  it("marks draft status as draft for journal filters", () => {
    expect(isSetReconcileDraftAttr({ SET_RECONCILE_STATUS: "DRAFT" })).toBe(true);
    expect(isSetReconcileDraftAttr({ SET_RECONCILE_STATUS: "NONE" })).toBe(false);
  });
});
