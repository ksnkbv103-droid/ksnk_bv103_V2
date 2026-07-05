import { describe, expect, it } from "vitest";
import { resolveVstScopedKhoaId } from "./vst-khoa-scope";

describe("resolveVstScopedKhoaId", () => {
  it("giữ khoa yêu cầu khi không phải mạng lưới", () => {
    expect(
      resolveVstScopedKhoaId({ isMangLuoiKsnk: false, actorKhoaId: null }, "k1"),
    ).toEqual({ ok: true, khoaId: "k1" });
  });

  it("mạng lưới: ép khoa actor", () => {
    expect(
      resolveVstScopedKhoaId({ isMangLuoiKsnk: true, actorKhoaId: "k-mine" }, "k-other"),
    ).toEqual({ ok: false, error: "Khoa được yêu cầu nằm ngoài phạm vi được phép." });
  });

  it("mạng lưới: dùng khoa actor khi không gửi khoa", () => {
    expect(
      resolveVstScopedKhoaId({ isMangLuoiKsnk: true, actorKhoaId: "k-mine" }, null),
    ).toEqual({ ok: true, khoaId: "k-mine" });
  });
});
