import { describe, expect, it } from "vitest";
import {
  buildQlcvSourceDeepLink,
  hrefForQlcvNguon,
  isSafeInternalAppHref,
  parseQlcvNguonFromSearchParams,
  sanitizeQlcvNguonHref,
} from "./qlcv-source-deep-link";

describe("qlcv-source-deep-link", () => {
  it("build CSSD_SU_CO link", () => {
    const href = buildQlcvSourceDeepLink({
      from: "CSSD_SU_CO",
      tieuDe: "Theo dõi NB sau thu hồi",
      moTa: "2 bộ đã dùng · mẻ M1",
      sourceId: "inc-1",
      sourceMa: "SC-01",
    });
    expect(href).toContain("from=CSSD_SU_CO");
    expect(href).toContain("create=1");
    expect(href).toContain("source_id=inc-1");
  });

  it("parse + href ngược", () => {
    const map = new Map([
      ["from", "CSSD_SU_CO"],
      ["source_id", "inc-1"],
    ]);
    const n = parseQlcvNguonFromSearchParams({ get: (k) => map.get(k) ?? null });
    expect(n?.module).toBe("CSSD_SU_CO");
    expect(hrefForQlcvNguon(n)).toContain("/cssd-su-co?id=inc-1");
  });

  it("rejects javascript / external / protocol-relative href", () => {
    expect(isSafeInternalAppHref("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalAppHref("https://evil.example")).toBe(false);
    expect(isSafeInternalAppHref("//evil.example/x")).toBe(false);
    expect(isSafeInternalAppHref("/giam-sat-chung?edit=1")).toBe(true);
    expect(sanitizeQlcvNguonHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeQlcvNguonHref("/cssd-su-co?id=1")).toBe("/cssd-su-co?id=1");
  });

  it("hrefForQlcvNguon ignores unsafe stored href and falls back to id", () => {
    expect(
      hrefForQlcvNguon({
        module: "GIAM_SAT",
        id: "sess-1",
        href: "javascript:alert(1)",
      }),
    ).toBe("/giam-sat-chung?session=sess-1");
  });
});
