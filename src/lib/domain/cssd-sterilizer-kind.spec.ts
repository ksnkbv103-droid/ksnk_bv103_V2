import { describe, expect, it } from "vitest";
import {
  classifySterilizerKind,
  isSteamSterilizerKind,
  isWasherLoaiMay,
} from "./cssd-sterilizer-kind";

describe("cssd-sterilizer-kind", () => {
  it("classifies from LM_* lookup, not the machine display name", () => {
    expect(classifySterilizerKind({ ma_loai_may: "LM_PLASMA", ten_thiet_bi: "Hấp 134" })).toBe("PLASMA");
    expect(classifySterilizerKind({ ma_loai_may: "LM_EO" })).toBe("EO");
    expect(
      classifySterilizerKind({
        loai_may: { ma_loai_may: "LM_HOI_NUOC", ten_loai_may: "Plasma nhầm tên" },
      }),
    ).toBe("STEAM");
  });

  it("falls back to name only when lookup code is missing", () => {
    expect(classifySterilizerKind({ loai_thiet_bi: "Hấp hơi nước 134°C" })).toBe("STEAM");
    expect(classifySterilizerKind({ ten_thiet_bi: "Máy plasma H2O2" })).toBe("PLASMA");
    expect(isSteamSterilizerKind({ ma_loai_may: "LM_HOI_NUOC" })).toBe(true);
  });

  it("recognizes washer kinds", () => {
    expect(isWasherLoaiMay("LM_RUA_TU_DONG")).toBe(true);
    expect(isWasherLoaiMay("LM_RUA_SIEU_AM")).toBe(true);
    expect(isWasherLoaiMay("LM_HOI_NUOC")).toBe(false);
  });
});
