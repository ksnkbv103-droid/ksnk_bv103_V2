import { describe, expect, it } from "vitest";
import {
  buildQlcvSourceDeepLink,
  hrefForQlcvNguon,
  parseQlcvNguonFromSearchParams,
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
});
