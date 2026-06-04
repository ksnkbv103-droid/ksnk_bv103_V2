import { describe, expect, it } from "vitest";
import { evaluateBatchSterilizationHeatRisk } from "./me-tiet-khuan-batch-heat";
import type { BomItem } from "@/lib/domain/cssd-packaging-rules";

const steamMachine = { loai_thiet_bi: "Hấp hơi nước 134°C" };

const allHeatTolerant: BomItem[] = [
  {
    loai_id: "a",
    ten: "Kẹp",
    so_luong_ke_hoach: 1,
    so_luong_thuc_te: 1,
    is_chiu_nhiet: true,
    phan_loai_spaulding: "CRITICAL",
    phuong_phap_tiet_khuan_chi_dinh: "STEAM_134",
  },
];

const mixedHeat: BomItem[] = [
  ...allHeatTolerant,
  {
    loai_id: "b",
    ten: "Ống nhựa",
    so_luong_ke_hoach: 1,
    so_luong_thuc_te: 1,
    is_chiu_nhiet: false,
    phan_loai_spaulding: "SEMI_CRITICAL",
    phuong_phap_tiet_khuan_chi_dinh: "PLASMA",
  },
];

describe("evaluateBatchSterilizationHeatRisk", () => {
  it("OK when empty batch", () => {
    const r = evaluateBatchSterilizationHeatRisk([], steamMachine);
    expect(r.level).toBe("OK");
  });

  it("OK for homogeneous heat-tolerant set on steam machine", () => {
    const r = evaluateBatchSterilizationHeatRisk(allHeatTolerant, steamMachine);
    expect(r.level).toBe("OK");
  });

  it("BLOCK mixed heat on steam sterilizer", () => {
    const r = evaluateBatchSterilizationHeatRisk(mixedHeat, steamMachine);
    expect(r.level).toBe("BLOCK");
    expect(r.messages.some((m) => /nhạy cảm nhiệt/i.test(m))).toBe(true);
  });
});
