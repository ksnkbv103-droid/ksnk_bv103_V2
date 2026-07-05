import { describe, expect, it } from "vitest";
import { resolveVstScopedSessionIds } from "./vst-session-scope";

describe("resolveVstScopedSessionIds", () => {
  const rows = [
    { id: "s1", khoa_id: "k1", nguoi_giam_sat_id: "ns1" },
    { id: "s2", khoa_id: "k2", nguoi_giam_sat_id: "ns2" },
    { id: "s3", khoa_id: "k9", nguoi_giam_sat_id: "ns-me" },
  ];

  it("allows all requested ids for non-network scope", () => {
    const result = resolveVstScopedSessionIds(["s1", "s2"], rows, {
      isMangLuoiKsnk: false,
      actorKhoaId: null,
    });
    expect(result).toEqual({ ok: true, targetIds: ["s1", "s2"] });
  });

  it("rejects missing session ids", () => {
    const result = resolveVstScopedSessionIds(["s1", "s3"], rows.slice(0, 2), {
      isMangLuoiKsnk: false,
      actorKhoaId: null,
    });
    expect(result).toEqual({ ok: false, error: "Một hoặc nhiều phiên không còn tồn tại." });
  });

  it("rejects network scope without actor khoa or nhan su", () => {
    const result = resolveVstScopedSessionIds(["s1"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: null,
      actorNhanSuId: null,
    });
    expect(result).toEqual({ ok: false, error: "Không xác định được phạm vi khoa của bạn." });
  });

  it("rejects network scope with out-of-scope session", () => {
    const result = resolveVstScopedSessionIds(["s1", "s2"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: "k1",
      actorNhanSuId: "ns1",
    });
    expect(result).toEqual({ ok: false, error: "Có phiên nằm ngoài phạm vi được phép." });
  });

  it("allows network scope when all sessions match khoa", () => {
    const result = resolveVstScopedSessionIds(["s1"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: "k1",
      actorNhanSuId: "ns1",
    });
    expect(result).toEqual({ ok: true, targetIds: ["s1"] });
  });

  it("allows network scope when session is supervised by actor at other khoa", () => {
    const result = resolveVstScopedSessionIds(["s3"], rows, {
      isMangLuoiKsnk: true,
      actorKhoaId: "k1",
      actorNhanSuId: "ns-me",
    });
    expect(result).toEqual({ ok: true, targetIds: ["s3"] });
  });
});
