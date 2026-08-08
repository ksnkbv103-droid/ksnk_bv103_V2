import { describe, expect, it } from "vitest";
import {
  baoCaoPeriodMa,
  buildPrintFileTitle,
  pickCssdCapPhatMa,
  pickSuCoPrintMa,
  sanitizePrintFileSegment,
  shortIdMa,
  shortPrefixedMa,
} from "./print-file-title";

describe("print-file-title", () => {
  it("sanitizes forbidden filename characters", () => {
    expect(sanitizePrintFileSegment('A/B:C*?"<>|  x')).toBe("A_B_C_x");
    expect(sanitizePrintFileSegment("  ")).toBe("KHONG_MA");
  });

  it("shortIdMa / shortPrefixedMa take first 8 hex of uuid", () => {
    expect(shortIdMa("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("A1B2C3D4");
    expect(shortPrefixedMa("QT", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("QT-A1B2C3D4");
    expect(shortIdMa("")).toBe("KHONG_MA");
  });

  it("pickCssdCapPhatMa prefers ma_bo then cycle then lot", () => {
    expect(
      pickCssdCapPhatMa({
        maBo: "B01.SET.01",
        maCycleQr: "BV103-CYC-1",
        maLo: "LOT-1",
        quyTrinhId: "uuid",
      }),
    ).toBe("B01.SET.01");
    expect(pickCssdCapPhatMa({ maBo: "—", maCycleQr: "BV103-CYC-1", maLo: "LOT-1" })).toBe(
      "BV103-CYC-1",
    );
    expect(pickCssdCapPhatMa({ maLo: "LOT-9" })).toBe("LOT-9");
    expect(pickCssdCapPhatMa({ quyTrinhId: "aabbccdd-1111-2222-3333-444455556666" })).toBe(
      "QT-AABBCCDD",
    );
  });

  it("baoCaoPeriodMa strips BC-TH- prefix", () => {
    expect(baoCaoPeriodMa("BC-TH-20260701-20260731")).toBe("20260701-20260731");
    expect(baoCaoPeriodMa("other")).toBe("other");
  });

  it("buildPrintFileTitle is LOAI_MA", () => {
    expect(
      buildPrintFileTitle({ loai: "LSGS", ma: "VST-20260802-A1B2C3D4" }),
    ).toBe("LSGS_VST-20260802-A1B2C3D4");
    expect(buildPrintFileTitle({ loai: "ME", ma: "LOT-20260802-01" })).toBe("ME_LOT-20260802-01");
    expect(buildPrintFileTitle({ loai: "CP", ma: "B01.SET.01" })).toBe("CP_B01.SET.01");
    expect(buildPrintFileTitle({ loai: "SUCO", ma: "A1B2C3D4" })).toBe("SUCO_A1B2C3D4");
    expect(buildPrintFileTitle({ loai: "CV", ma: "A1B2C3D4" })).toBe("CV_A1B2C3D4");
    expect(buildPrintFileTitle({ loai: "KHCV", ma: "WEEKLY_2026-08" })).toBe("KHCV_WEEKLY_2026-08");
    expect(buildPrintFileTitle({ loai: "TTCV", ma: "MONTH_2026-08" })).toBe("TTCV_MONTH_2026-08");
    expect(buildPrintFileTitle({ loai: "BAOCAO", ma: "20260701-20260731" })).toBe(
      "BAOCAO_20260701-20260731",
    );
    expect(buildPrintFileTitle({ loai: "TEMLOC", ma: "LOC_KHOA-K01" })).toBe("TEMLOC_LOC_KHOA-K01");
    expect(buildPrintFileTitle({ loai: "TEMBO", ma: "B01.SET.01" })).toBe("TEMBO_B01.SET.01");
    expect(buildPrintFileTitle({ loai: "TEMMAY", ma: "MAY-01" })).toBe("TEMMAY_MAY-01");
    expect(buildPrintFileTitle({ loai: "TEMCYC", ma: "BV103-CYC-1" })).toBe("TEMCYC_BV103-CYC-1");
  });

  it("pickSuCoPrintMa uses SC-date-hex", () => {
    expect(
      pickSuCoPrintMa({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        createdAt: "2026-08-03T08:00:00.000Z",
      }),
    ).toBe("SC-20260803-A1B2C3D4");
    expect(pickSuCoPrintMa({ id: "aabbccdd-1111-2222-3333-444455556666" })).toBe("SC-AABBCCDD");
  });

  it("truncates overly long titles while keeping LOAI", () => {
    const longMa = "X".repeat(200);
    const title = buildPrintFileTitle({ loai: "CP", ma: longMa });
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.startsWith("CP_")).toBe(true);
  });
});
