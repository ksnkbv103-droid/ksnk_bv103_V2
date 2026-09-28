import { describe, expect, it } from "vitest";
import {
  buildChuongTrinhEditAudit,
  parseChuongTrinhCatalogFromSpecs,
  pickDefaultChuongTrinh,
  prefillFromChuongTrinh,
  resolveChuongTrinhOptions,
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
});
