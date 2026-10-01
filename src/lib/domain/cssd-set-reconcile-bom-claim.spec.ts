import { describe, expect, it } from "vitest";
import {
  BOM_APPROVE_CLAIM_STATUS,
  BOM_APPROVE_FAILED_STATUS,
  canClaimBomApprove,
  canRejectBomApprove,
  isBomApproveHistoryStatus,
} from "./cssd-set-reconcile";

describe("BOM reconcile claim-before-apply", () => {
  it("chỉ claim từ BOM_PENDING", () => {
    expect(canClaimBomApprove("BOM_PENDING")).toBe(true);
    expect(canClaimBomApprove("BOM_APPLYING")).toBe(false);
    expect(canClaimBomApprove("BOM_APPLY_FAILED")).toBe(false);
    expect(canClaimBomApprove("BOM_APPROVED")).toBe(false);
  });

  it("reject từ PENDING / FAILED / APPLYING stale — không revert PENDING", () => {
    expect(canRejectBomApprove("BOM_PENDING")).toBe(true);
    expect(canRejectBomApprove("BOM_APPLY_FAILED")).toBe(true);
    expect(canRejectBomApprove("BOM_APPLYING")).toBe(true);
    expect(canRejectBomApprove("BOM_APPROVED")).toBe(false);
    expect(canRejectBomApprove("BOM_REJECTED")).toBe(false);
  });

  it("history gồm FAILED; queue vẫn chỉ PENDING (claim helper)", () => {
    expect(isBomApproveHistoryStatus("BOM_APPLY_FAILED")).toBe(true);
    expect(isBomApproveHistoryStatus("BOM_APPROVED")).toBe(true);
    expect(isBomApproveHistoryStatus("BOM_PENDING")).toBe(false);
    expect(BOM_APPROVE_CLAIM_STATUS).toBe("BOM_APPLYING");
    expect(BOM_APPROVE_FAILED_STATUS).toBe("BOM_APPLY_FAILED");
  });
});
