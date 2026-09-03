import { describe, expect, it } from "vitest";
import {
  applyResolvedTramToLoaiSpecs,
  buildLoaiPhysicalUpsertPayload,
  mapIsChiuNhietToKhaNang,
  mapKhaNangToIsChiuNhiet,
  mapLoaiDungCuExcelExportRow,
  normalizeLoaiDungCuExcelImportRow,
  normalizeSpauldingForMaster,
  normalizeSterileMethodForMaster,
  resolveSuggestedTramFromCatalog,
  suggestCssdStationFromMaster,
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

  it("suggests CSSD station from Spaulding/heat/PP (D-16)", () => {
    expect(
      suggestCssdStationFromMaster({
        spaulding: "CRITICAL",
        sterileMethod: "STEAM_134",
        isChiuNhiet: true,
      }).maTramGoiY,
    ).toBe("TRAM_HOI_134");
    expect(
      suggestCssdStationFromMaster({
        sterileMethod: "EO",
        isChiuNhiet: true,
      }).maTramGoiY,
    ).toBe("TRAM_EO");
    expect(
      suggestCssdStationFromMaster({
        sterileMethod: "STEAM_134",
        isChiuNhiet: false,
      }).maTramGoiY,
    ).toBe("TRAM_PLASMA");
  });

  it("DM-5: gắn gợi ý với trạm thật trên sổ viện (exact hoặc alias TIET_KHUAN)", () => {
    const catalog = [
      { id: "tram-tk", ma: "TIET_KHUAN", ten: "Tiệt khuẩn" },
      { id: "tram-134", ma: "TRAM_HOI_134", ten: "Hấp 134" },
    ];
    const exact = resolveSuggestedTramFromCatalog("TRAM_HOI_134", catalog);
    expect(exact).toMatchObject({ id: "tram-134", ma: "TRAM_HOI_134", matchedBy: "exact" });

    const alias = resolveSuggestedTramFromCatalog("TRAM_PLASMA", [
      { id: "tram-tk", ma: "TIET_KHUAN", ten: "Tiệt khuẩn" },
    ]);
    expect(alias).toMatchObject({ id: "tram-tk", ma: "TIET_KHUAN", matchedBy: "alias" });
    if (!alias) throw new Error("expected alias");

    expect(resolveSuggestedTramFromCatalog("TRAM_KHU_TRUNG", catalog)).toBeNull();

    const specs = applyResolvedTramToLoaiSpecs({}, alias, "TRAM_PLASMA");
    expect(specs.tram_cssd_id).toBe("tram-tk");
    expect(specs.ma_tram_goi_y).toBe("TRAM_PLASMA");
    expect(specs.ma_tram_thuc_te).toBe("TIET_KHUAN");

    const cleared = applyResolvedTramToLoaiSpecs(specs, null, "TRAM_KHU_TRUNG");
    expect(cleared.tram_cssd_id).toBeUndefined();
    expect(cleared.ma_tram_goi_y).toBe("TRAM_KHU_TRUNG");
  });

  it("DM-4: Excel xuất dùng alias, không lộ ma_loai/ten_loai", () => {
    const row = mapLoaiDungCuExcelExportRow({
      ma_loai: "KEO-01",
      ten_loai: "Kéo Mayo",
      is_chiu_nhiet: false,
      phan_loai_spaulding: "SEMI_CRITICAL",
      phuong_phap_tiet_khuan_chi_dinh: "PLASMA",
      phan_loai: "PHAU_THUAT",
      so_luong_kho_du_phong: 2,
      is_active: true,
      specs: { hinh_dang: "Cong", kich_thuoc: "14cm" },
    });
    expect(row.ma_loai_dung_cu).toBe("KEO-01");
    expect(row.ten_loai_dung_cu).toBe("Kéo Mayo");
    expect(row).not.toHaveProperty("ma_loai");
    expect(row).not.toHaveProperty("ten_loai");
    expect(row.kha_nang_chiu_nhiet).toBe("Thấp");
    expect(row.hinh_dang).toBe("Cong");
  });

  it("DM-4: Excel nạp nhận cả tên cột cũ và cột UI", () => {
    const fromPhysical = normalizeLoaiDungCuExcelImportRow({
      ma_loai: "panh-01",
      ten_loai: "Panh",
    });
    expect(fromPhysical.ma_loai_dung_cu).toBe("PANH-01");
    expect(fromPhysical.ten_loai_dung_cu).toBe("Panh");

    const fromAlias = normalizeLoaiDungCuExcelImportRow({
      ma_loai_dung_cu: "KEO-01",
      ten_loai_dung_cu: "Kéo",
    });
    expect(fromAlias.ma_loai_dung_cu).toBe("KEO-01");
    expect(fromAlias.ten_loai_dung_cu).toBe("Kéo");
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
