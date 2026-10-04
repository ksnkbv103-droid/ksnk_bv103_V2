import { describe, expect, it } from "vitest";
import {
  buildChuongTrinhEditAudit,
  parseChuongTrinhCatalogFromSpecs,
  pickDefaultChuongTrinh,
  prefillFromChuongTrinh,
  resolveChuongTrinhOptions,
  resolveChuongTrinhOptionsForMachine,
  chuongTrinhChuanForQc,
  evaluatePhysicalOutsideChuongTrinhChuan,
  QT21_HD03_CHUONG_TRINH_BY_PP,
} from "./me-tiet-khuan-chuong-trinh";

describe("me-tiet-khuan-chuong-trinh M-04 thin", () => {
  it("QT21 HD.03 templates cover 3 PP without inventing CDC", () => {
    expect(QT21_HD03_CHUONG_TRINH_BY_PP.HOI_NUOC).toHaveLength(2);
    expect(QT21_HD03_CHUONG_TRINH_BY_PP.PLASMA_H2O2.some((o) => o.thoi_gian_chu_ky === "28-35")).toBe(
      true,
    );
    expect(QT21_HD03_CHUONG_TRINH_BY_PP.EO.some((o) => o.nhiet_do === "55")).toBe(true);
  });

  it("parses specs.chuong_trinh_catalog and prefers it over QT21", () => {
    const specs = {
      chuong_trinh_catalog: [
        { ma: "P1", ten: "Chương trình 1 máy A", nhiet_do: "134", thoi_gian: "8" },
      ],
    };
    const opts = resolveChuongTrinhOptions({ method: "HOI_NUOC", specs });
    expect(opts).toHaveLength(1);
    expect(opts[0]?.ma).toBe("P1");
    expect(opts[0]?.nguon).toBe("specs");
  });

  it("prefers cssd_dm_chuong_trinh_may over specs and QT21", () => {
    const opts = resolveChuongTrinhOptions({
      method: "HOI_NUOC",
      specs: { chuong_trinh_catalog: [{ ma: "P1", ten: "Specs" }] },
      mdmRows: [
        {
          ma_chuong_trinh: "MDM1",
          ten_chuong_trinh: "Máy A 134",
          nhiet_do_chuan: "134",
          is_active: true,
        },
        { ma_chuong_trinh: "OFF", ten_chuong_trinh: "Tắt", is_active: false },
      ],
    });
    expect(opts).toHaveLength(1);
    expect(opts[0]?.ma).toBe("MDM1");
    expect(opts[0]?.nguon).toBe("mdm");
    expect(opts[0]?.nhiet_do).toBe("134");
  });

  it("empty MDM on machine falls through to QT21 HD.03", () => {
    const opts = resolveChuongTrinhOptionsForMachine({
      phuong_phap: "PLASMA_H2O2",
      specs: {},
      mdm_chuong_trinh: [],
    });
    expect(opts.every((o) => o.nguon === "qt21_hd03")).toBe(true);
    expect(opts.map((o) => o.ma)).toEqual(["PL_NGAN", "PL_DAI"]);
  });

  it("falls back to QT21 HD.03 when tip lacks máy catalog", () => {
    const opts = resolveChuongTrinhOptions({ method: "HOI_NUOC", specs: {} });
    expect(opts.every((o) => o.nguon === "qt21_hd03")).toBe(true);
    expect(opts.length).toBeGreaterThanOrEqual(2);
  });

  it("default = gần nhất theo hint last batch", () => {
    const opts = resolveChuongTrinhOptions({ method: "HOI_NUOC", specs: {} });
    const picked = pickDefaultChuongTrinh(opts, "Hơi nước 121 °C");
    expect(picked?.ma).toBe("HN_121");
  });

  it("prefill + audit when NV edits nhiệt", () => {
    const opt = resolveChuongTrinhOptions({ method: "HOI_NUOC", specs: {} })[0]!;
    const pre = prefillFromChuongTrinh(opt);
    expect(pre.nhietDo).toBe(opt.nhiet_do);
    const untouched = buildChuongTrinhEditAudit({
      prefill: pre,
      chuongTrinh: pre.chuongTrinh,
      nhietDo: pre.nhietDo,
      apSuat: pre.apSuat,
      thoiGianChuKy: pre.thoiGianChuKy,
    });
    expect(untouched?.thong_so_edited).toBe(false);
    const edited = buildChuongTrinhEditAudit({
      prefill: pre,
      chuongTrinh: pre.chuongTrinh,
      nhietDo: "135",
      apSuat: pre.apSuat,
      thoiGianChuKy: pre.thoiGianChuKy,
    });
    expect(edited?.thong_so_edited).toBe(true);
  });

  it("parseChuongTrinhCatalogFromSpecs reads mac_dinh single", () => {
    const list = parseChuongTrinhCatalogFromSpecs({
      chuong_trinh_mac_dinh: "134 vải",
      nhiet_do_chuan: "134",
    });
    expect(list[0]?.ten).toBe("134 vải");
  });

  it("ME-08: so chuẩn catalog — lệch nhiệt → outside; QT21 mẫu không so", () => {
    const mdm = chuongTrinhChuanForQc({
      ma: "M1",
      ten: "134",
      nhiet_do: "134",
      ap_suat: "2.1",
      thoi_gian_chu_ky: "18",
      nguon: "mdm",
    });
    expect(
      evaluatePhysicalOutsideChuongTrinhChuan({
        nhietDo: 121,
        apSuat: 2.1,
        thoiGianChuKy: 18,
        chuan: mdm,
      }),
    ).toBe(true);
    expect(chuongTrinhChuanForQc(QT21_HD03_CHUONG_TRINH_BY_PP.HOI_NUOC[0])).toBeNull();
  });
});
