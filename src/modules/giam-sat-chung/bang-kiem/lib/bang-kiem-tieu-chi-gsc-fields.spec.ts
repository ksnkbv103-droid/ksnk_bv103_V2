import { describe, expect, it } from "vitest";
import {
  parseTieuChiKieuDuLieu,
  resolveTieuChiGscPersistFields,
} from "./bang-kiem-tieu-chi-gsc-fields";

describe("bang-kiem-tieu-chi-gsc-fields", () => {
  it("maps ENUM/NUMBER aliases to GSC codes", () => {
    expect(parseTieuChiKieuDuLieu("ENUM")).toBe("LUA_CHON");
    expect(parseTieuChiKieuDuLieu("number")).toBe("SO_LIEU");
  });

  it("defaults boolean checklist fields", () => {
    const out = resolveTieuChiGscPersistFields({});
    expect(out).toEqual({
      ok: true,
      fields: {
        kieu_du_lieu: "BOOLEAN",
        la_then_chot: false,
        cho_phep_kpa: true,
        cac_lua_chon: null,
        nguong_min: null,
        nguong_max: null,
        don_vi: null,
        weight_type: "MAJOR",
        is_red_flag: false,
      },
    });
  });

  it("requires options for LUA_CHON and keeps only those fields", () => {
    expect(resolveTieuChiGscPersistFields({ kieu_du_lieu: "LUA_CHON" }).ok).toBe(false);
    const out = resolveTieuChiGscPersistFields({
      kieu_du_lieu: "LUA_CHON",
      cac_lua_chon: "Đạt\nKhông đạt",
      nguong_min: 1,
      don_vi: "°C",
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.fields.cac_lua_chon).toEqual(["Đạt", "Không đạt"]);
      expect(out.fields.nguong_min).toBeNull();
      expect(out.fields.don_vi).toBeNull();
    }
  });

  it("keeps ngưỡng for SO_LIEU and rejects min > max", () => {
    expect(
      resolveTieuChiGscPersistFields({
        kieu_du_lieu: "SO_LIEU",
        nguong_min: 10,
        nguong_max: 1,
      }).ok,
    ).toBe(false);
    const out = resolveTieuChiGscPersistFields({
      kieu_du_lieu: "SO_LIEU",
      nguong_min: "0",
      nguong_max: "50",
      don_vi: "°C",
      la_then_chot: true,
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.fields.nguong_min).toBe(0);
      expect(out.fields.nguong_max).toBe(50);
      expect(out.fields.don_vi).toBe("°C");
      expect(out.fields.la_then_chot).toBe(true);
      expect(out.fields.cac_lua_chon).toBeNull();
    }
  });
});
