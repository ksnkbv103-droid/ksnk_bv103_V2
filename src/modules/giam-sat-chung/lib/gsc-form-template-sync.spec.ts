import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mdm-read-gateway", () => ({
  getBangKiemsForGiamSat: vi.fn(),
  getTieuChisForGiamSatChung: vi.fn(),
}));

import { mapTieuChiJsonbToCriterion } from "./gsc-form-template-sync";

describe("mapTieuChiJsonbToCriterion", () => {
  it("mặc định: MAJOR, maxScore 1, BOOLEAN, cho_phep_kpa true", () => {
    const c = mapTieuChiJsonbToCriterion({ id: "t1", noi_dung: "  " });
    expect(c).toMatchObject({
      id: "t1",
      label: "Tiêu chí",
      maxScore: 1,
      weightType: "MAJOR",
      isRedFlag: false,
      kieu_du_lieu: "BOOLEAN",
      la_then_chot: false,
      cho_phep_kpa: true,
      cac_lua_chon: null,
    });
  });
  it("chuẩn hóa kiểu dữ liệu và ưu tiên camelCase", () => {
    expect(mapTieuChiJsonbToCriterion({ id: "a", kieu_du_lieu: "enum", cac_lua_chon: ["x"] })).toMatchObject({ kieu_du_lieu: "LUA_CHON", cac_lua_chon: ["x"] });
    expect(mapTieuChiJsonbToCriterion({ id: "b", kieu_du_lieu: "number" }).kieu_du_lieu).toBe("SO_LIEU");
    const c = mapTieuChiJsonbToCriterion({ id: "c", weightType: "CRITICAL", weight_type: "MINOR", is_red_flag: true, cho_phep_kpa: false });
    expect(c.weightType).toBe("CRITICAL");
    expect(c.isRedFlag).toBe(true);
    expect(c.cho_phep_kpa).toBe(false);
  });
});
