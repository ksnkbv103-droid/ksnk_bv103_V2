import { describe, expect, it } from "vitest";
import {
  buildLoaiPhysicalUpsertPayload,
  mapIsChiuNhietToKhaNang,
  mapKhaNangToIsChiuNhiet,
  normalizeSpauldingForMaster,
  normalizeSterileMethodForMaster,
  syncLoaiPhysicalColumnsOnImportPayload,
} from "./cssd-loai-dung-cu-map";

describe("cssd-loai-dung-cu-map heat/Spaulding", () => {
  it("maps Cao/Thấp ↔ is_chiu_nhiet", () => {
    expect(mapKhaNangToIsChiuNhiet("Cao")).toBe(true);
    expect(mapKhaNangToIsChiuNhiet("Thấp")).toBe(false);
    expect(mapIsChiuNhietToKhaNang(false)).toBe("Thấp");
  });

  it("normalizes sterile labels to CHECK-safe codes", () => {
    expect(normalizeSterileMethodForMaster("Hơi nước")).toBe("STEAM_134");
    expect(normalizeSterileMethodForMaster("Plasma")).toBe("PLASMA");
    expect(normalizeSterileMethodForMaster("EO")).toBe("EO");
    expect(normalizeSpauldingForMaster("semi_critical")).toBe("SEMI_CRITICAL");
  });

  it("BOM runtime re-exports same aliases via cssd-quy-trinh-bom", async () => {
    const bom = await import("@/modules/cssd-erp/shared/domain/cssd-quy-trinh-bom");
    expect(bom.normalizeSteamMethod("Hơi nước")).toBe("STEAM_134");
    expect(bom.normalizeSteamMethod("121")).toBe("STEAM_121");
    expect(bom.normalizeSpaulding("semi_critical")).toBe("SEMI_CRITICAL");
  });

  it("writes physical domain columns on upsert payload", () => {
    const p = buildLoaiPhysicalUpsertPayload({
      ma_danh_muc: "KEO-01",
      ten_danh_muc: "Kéo Mayo",
      kha_nang_chiu_nhiet: "Thấp",
      phuong_phap_tiet_khuan: "Plasma",
      phan_loai_spaulding: "SEMI_CRITICAL",
    });
    expect(p.is_chiu_nhiet).toBe(false);
    expect(p.phan_loai_spaulding).toBe("SEMI_CRITICAL");
    expect(p.phuong_phap_tiet_khuan_chi_dinh).toBe("PLASMA");
    expect((p.specs as { kha_nang_chiu_nhiet: string }).kha_nang_chiu_nhiet).toBe("Thấp");
  });

  it("syncs import payload onto physical columns", () => {
    const payload: Record<string, unknown> = {
      ten_loai_dung_cu: "Panh",
      kha_nang_chiu_nhiet: "Cao",
      phuong_phap_tiet_khuan: "Hơi nước",
      phan_loai_spaulding: "CRITICAL",
      specs: {},
    };
    syncLoaiPhysicalColumnsOnImportPayload(payload, "PANH-01");
    expect(payload.ma_loai).toBe("PANH-01");
    expect(payload.is_chiu_nhiet).toBe(true);
    expect(payload.phuong_phap_tiet_khuan_chi_dinh).toBe("STEAM_134");
    expect(payload.phan_loai_spaulding).toBe("CRITICAL");
  });
});
