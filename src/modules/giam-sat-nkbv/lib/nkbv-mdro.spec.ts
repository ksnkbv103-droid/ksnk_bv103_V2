import { describe, expect, it } from "vitest";
import {
  buildGscMdroDeepLink,
  inferMdroPhenotypeFromOrganism,
  normalizeMdroPhenotype,
  parseMdroFlag,
} from "./nkbv-mdro";

describe("nkbv-mdro", () => {
  it("parseMdroFlag nhận có/true/1", () => {
    expect(parseMdroFlag("có")).toBe(true);
    expect(parseMdroFlag("true")).toBe(true);
    expect(parseMdroFlag(false)).toBe(false);
  });

  it("normalizeMdroPhenotype", () => {
    expect(normalizeMdroPhenotype("cre")).toBe("CRE");
    expect(normalizeMdroPhenotype("CephR Klebsiella")).toBe("CEPH_R_KLEB");
  });

  it("infer từ tên tác nhân rõ ràng", () => {
    expect(inferMdroPhenotypeFromOrganism("MRSA")).toBe("MRSA");
    expect(inferMdroPhenotypeFromOrganism("E. coli")).toBeNull();
  });

  it("deep-link GSC", () => {
    const href = buildGscMdroDeepLink({
      bangKiemMa: "BM.31.03",
      khoaId: "k1",
      maBenhAn: "BA-1",
      maBenhNhan: "P1",
      tenBenhNhan: "A",
    });
    expect(href).toContain("/giam-sat-chung/tuan-thu?");
    expect(href).toContain("bk=BM.31.03");
    expect(href).toContain("ma_benh_an=BA-1");
  });
});
