import { describe, expect, it } from "vitest";
import { resolveGscScopedKhoaId } from "./gsc-khoa-scope";

describe("resolveGscScopedKhoaId", () => {
  it("keeps requested khoa for non-network scope", () => {
    expect(
      resolveGscScopedKhoaId(
        { isMangLuoiKsnk: false, actorKhoaId: null },
        "khoa-a",
      ),
    ).toEqual({ ok: true, khoaId: "khoa-a" });
  });

  it("rejects network scope without actor khoa", () => {
    expect(
      resolveGscScopedKhoaId(
        { isMangLuoiKsnk: true, actorKhoaId: null },
        "khoa-a",
      ),
    ).toEqual({ ok: false, error: "Không xác định được phạm vi khoa của bạn." });
  });

  it("forces actor khoa when network scope and no requested khoa", () => {
    expect(
      resolveGscScopedKhoaId(
        { isMangLuoiKsnk: true, actorKhoaId: "khoa-a" },
        null,
      ),
    ).toEqual({ ok: true, khoaId: "khoa-a" });
  });

  it("rejects requested khoa outside network scope", () => {
    expect(
      resolveGscScopedKhoaId(
        { isMangLuoiKsnk: true, actorKhoaId: "khoa-a" },
        "khoa-b",
      ),
    ).toEqual({ ok: false, error: "Khoa được yêu cầu nằm ngoài phạm vi được phép." });
  });
});
