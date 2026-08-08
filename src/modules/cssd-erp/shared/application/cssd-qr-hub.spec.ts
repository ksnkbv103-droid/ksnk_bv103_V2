import { describe, expect, it } from "vitest";
import { cssdQrHubResolvedSchema } from "../contracts/cssd-qr-hub.contracts";

describe("cssd-qr-hub contracts", () => {
  it("parses instrument set with workflow and bo ids", () => {
    const parsed = cssdQrHubResolvedSchema.parse({
      targetType: "INSTRUMENT_SET",
      code: "bv103-cyc-250610-ab12cd34",
      workflowId: "wf-1",
      boDungCuId: "bo-1",
    });
    expect(parsed.code).toBe("BV103-CYC-250610-AB12CD34");
    expect(parsed.workflowId).toBe("wf-1");
    expect(parsed.boDungCuId).toBe("bo-1");
  });

  it("parses machine resolve", () => {
    const parsed = cssdQrHubResolvedSchema.parse({
      targetType: "MACHINE",
      code: "may-01",
      machineId: "m-1",
      machineCode: "MAY-01",
    });
    expect(parsed.targetType).toBe("MACHINE");
    expect(parsed.code).toBe("MAY-01");
    expect(parsed.machineCode).toBe("MAY-01");
  });

  it("allows instrument set with only catalog bo (no active workflow)", () => {
    const parsed = cssdQrHubResolvedSchema.parse({
      targetType: "INSTRUMENT_SET",
      code: "B01.SET.01",
      boDungCuId: "bo-only",
    });
    expect(parsed.workflowId).toBeUndefined();
    expect(parsed.boDungCuId).toBe("bo-only");
  });
});
