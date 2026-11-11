import { describe, expect, it } from "vitest";
import {
  buildSetReconcileAttributePatch,
  canReleaseSetReconcileDraft,
  isSetReconcileDraftAttr,
  isSetReconcileDraftOwner,
  parseSetReconcileSnapshot,
  readSetReconcileStatus,
} from "./cssd-set-reconcile-attrs";

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

  it("reads claim and failed BOM approve tokens", () => {
    expect(readSetReconcileStatus({ SET_RECONCILE_STATUS: "BOM_APPLYING" })).toBe("BOM_APPLYING");
    expect(readSetReconcileStatus({ SET_RECONCILE_STATUS: "BOM_APPLY_FAILED" })).toBe("BOM_APPLY_FAILED");
  });
});

describe("isSetReconcileDraftOwner (CSSD-012)", () => {
  it("chỉ khớp khi auth user trùng chủ nháp", () => {
    expect(isSetReconcileDraftOwner({ REPORTER_AUTH_USER_ID: "u-1" }, "u-1")).toBe(true);
    expect(isSetReconcileDraftOwner({ REPORTER_AUTH_USER_ID: "u-1" }, "u-2")).toBe(false);
    expect(isSetReconcileDraftOwner({ REPORTER_AUTH_USER_ID: "u-1" }, null)).toBe(false);
    expect(isSetReconcileDraftOwner({}, "u-1")).toBe(false);
  });
});

describe("canReleaseSetReconcileDraft (CSSD-012 ADMIN)", () => {
  const attrs = { REPORTER_AUTH_USER_ID: "u-1" };
  it("chủ nháp được hủy", () => expect(canReleaseSetReconcileDraft(attrs, "u-1", false)).toBe(true));
  it("người khác không phải ADMIN bị từ chối", () => expect(canReleaseSetReconcileDraft(attrs, "u-2", false)).toBe(false));
  it("ADMIN hủy được nháp của người khác", () => expect(canReleaseSetReconcileDraft(attrs, "u-2", true)).toBe(true));
});
