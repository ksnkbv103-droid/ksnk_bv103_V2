import { describe, expect, it } from "vitest";

describe("cssd-instrument-ops facade exports", () => {
  it("exposes MDM and CSSD workflow entrypoints", async () => {
    const mod = await import("./cssd-instrument-ops.actions");
    expect(typeof mod.replenishSetInstrumentAction).toBe("function");
    expect(typeof mod.requestReplenishFromReserveAction).toBe("function");
    expect(typeof mod.reportIndividualInstrumentIssueAction).toBe("function");
  });
});
