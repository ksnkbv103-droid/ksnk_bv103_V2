import { describe, expect, it } from "vitest";
import { pickSearchParam } from "./redirect-with-query";

describe("pickSearchParam", () => {
  it("returns first array value or scalar", () => {
    expect(pickSearchParam(undefined)).toBeNull();
    expect(pickSearchParam("a")).toBe("a");
    expect(pickSearchParam(["x", "y"])).toBe("x");
    expect(pickSearchParam([])).toBeNull();
  });
});
