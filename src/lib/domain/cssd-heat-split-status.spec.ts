import { describe, expect, it } from "vitest";
import { packConfirmBlockedByHeatSplit, resolveHeatSplitStatus } from "./cssd-heat-split-status";
import { isReadyForPackaging, type BomItem } from "./cssd-packaging-rules";

const mixed: BomItem[] = [
  {
    loai_id: "1",
    ten: "Kẹp",
    so_luong_ke_hoach: 1,
    so_luong_thuc_te: 1,
    is_chiu_nhiet: true,
    phan_loai_spaulding: "CRITICAL",
    phuong_phap_tiet_khuan_chi_dinh: "STEAM_134",
  },
  {
    loai_id: "2",
    ten: "Camera",
    so_luong_ke_hoach: 1,
    so_luong_thuc_te: 1,
    is_chiu_nhiet: false,
    phan_loai_spaulding: "SEMI_CRITICAL",
    phuong_phap_tiet_khuan_chi_dinh: "PLASMA",
  },
];

describe("cssd-heat-split-status", () => {
  it("blocks pack confirm until SUB exists", () => {
    const status = resolveHeatSplitStatus({ requireSplit: true, hasActiveSub: false });
    expect(status).toBe("NONE");
    expect(packConfirmBlockedByHeatSplit(status).blocked).toBe(true);
    expect(isReadyForPackaging(mixed, "NONE").ready).toBe(false);
  });

  it("unblocks after SUB register (MAIN + child)", () => {
    const status = resolveHeatSplitStatus({
      requireSplit: true,
      maVaiTroBo: "MAIN",
      hasActiveSub: true,
    });
    expect(status).toBe("DONE");
    expect(packConfirmBlockedByHeatSplit(status).blocked).toBe(false);
    expect(isReadyForPackaging(mixed, "DONE").ready).toBe(true);
  });
});
