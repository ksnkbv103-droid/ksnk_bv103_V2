import { describe, expect, it } from "vitest";
import {
  EMPTY_GSC_BO_SUNG_NB,
  formatGscBoSungCanThiepLabel,
  parseGscBoSungNbFromUnknown,
  serializeGscBoSungNbForMetadata,
} from "./gsc-bo-sung-nguoi-benh";

describe("gsc-bo-sung-nguoi-benh", () => {
  it("parse empty → defaults", () => {
    expect(parseGscBoSungNbFromUnknown(null)).toEqual(EMPTY_GSC_BO_SUNG_NB);
  });

  it("round-trip serialize when enabled", () => {
    const snap = parseGscBoSungNbFromUnknown({
      bn_tho_may: true,
      bn_cvc: "1",
      bn_nhiem_mdro: true,
      bn_mdro_phenotype: "CRE",
      bn_nhiem_tac_nhan_nguy_hiem: true,
      bn_tac_nhan_nguy_hiem_ten: "TB",
    });
    expect(snap.bn_tho_may).toBe(true);
    expect(snap.bn_cvc).toBe(true);
    expect(snap.bn_mdro_phenotype).toBe("CRE");
    const meta = serializeGscBoSungNbForMetadata(snap, true);
    expect(meta.bn_tho_may).toBe(true);
    expect(meta.bn_mdro_phenotype).toBe("CRE");
    expect(meta.bn_tac_nhan_nguy_hiem_ten).toBe("TB");
  });

  it("serialize clears when disabled", () => {
    const meta = serializeGscBoSungNbForMetadata(
      { ...EMPTY_GSC_BO_SUNG_NB, bn_tho_may: true },
      false,
    );
    expect(meta.bn_tho_may).toBeNull();
  });

  it("format can thiệp label", () => {
    expect(
      formatGscBoSungCanThiepLabel({
        ...EMPTY_GSC_BO_SUNG_NB,
        bn_tho_may: true,
        bn_foley: true,
      }),
    ).toContain("Thở máy");
  });
});
