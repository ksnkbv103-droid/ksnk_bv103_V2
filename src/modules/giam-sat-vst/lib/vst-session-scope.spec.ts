import { describe, expect, it } from "vitest";
import { resolveVstScopedSessionIds } from "./vst-session-scope";

describe("resolveVstScopedSessionIds", () => {
  const rows = [
    { id: "s1", khoa_id: "k1" },
    { id: "s2", khoa_id: "k2" },
  ];

  it("allows all requested ids for non-network scope", () => {
    const result = resolveVstScopedSessionIds(["s1", "s2"], rows, {
      isMangLuoiKsnk: false,
      actorKhoaId: null,
    });
    expect(result).toEqual({ ok: true, targetIds: ["s1", "s2"] });
  });

  it("rejects missing session ids", () => {
    const result = resolveVstScopedSessionIds(["s1", "s3"], rows, {
      isMangLuoiKsnk: false,
      actorKhoaId: null,
    });
    expect(result).toEqual({ ok: false, error: "Một hoặc nhiều phiên không còn tồn tại." });
  });

  it("rejects network scope without actor khoa", () => {
    const result = resolveVstScopedSessionIds(["s1"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: null,
    });
    expect(result).toEqual({ ok: false, error: "Không xác định được phạm vi khoa của bạn." });
  });

  it("rejects network scope with out-of-scope session", () => {
    const result = resolveVstScopedSessionIds(["s1", "s2"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: "k1",
    });
    expect(result).toEqual({ ok: false, error: "Có phiên nằm ngoài phạm vi khoa được phép." });
  });

  it("allows network scope when all sessions are same khoa", () => {
    const result = resolveVstScopedSessionIds(["s1"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: "k1",
    });
    expect(result).toEqual({ ok: true, targetIds: ["s1"] });
  });
});
