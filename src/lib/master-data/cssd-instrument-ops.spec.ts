import { describe, expect, it } from "vitest";

describe("cssd-instrument-ops facade exports", () => {
  it("keeps closed entrypoints callable (reject at runtime — sự cố only)", async () => {
    const mod = await import("./cssd-instrument-ops.actions");
    expect(typeof mod.replenishSetInstrumentAction).toBe("function");
    expect(typeof mod.requestReplenishFromReserveAction).toBe("function");
    expect(typeof mod.reportIndividualInstrumentIssueAction).toBe("function");
  });
});
