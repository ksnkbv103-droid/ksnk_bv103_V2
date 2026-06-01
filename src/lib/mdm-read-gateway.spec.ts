import { describe, expect, it } from "vitest";
import * as gateway from "./mdm-read-gateway";

describe("mdm-read-gateway", () => {
  it("exports GSC read helpers", () => {
    expect(typeof gateway.getBangKiemsForGiamSat).toBe("function");
    expect(typeof gateway.getTieuChisForGiamSatChung).toBe("function");
  });
});
