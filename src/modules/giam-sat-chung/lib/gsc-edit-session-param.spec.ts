import { describe, expect, it } from "vitest";
import { pickGscEditSessionId } from "./gsc-edit-session-param";

describe("pickGscEditSessionId", () => {
  it("prefers edit over session", () => {
    expect(pickGscEditSessionId({ edit: "e1", session: "s1" })).toBe("e1");
  });

  it("falls back to session for legacy QLCV links", () => {
    expect(pickGscEditSessionId({ session: "s1" })).toBe("s1");
    expect(pickGscEditSessionId({ edit: "", session: "s1" })).toBe("s1");
  });

  it("returns null when both missing", () => {
    expect(pickGscEditSessionId({})).toBeNull();
  });
});
