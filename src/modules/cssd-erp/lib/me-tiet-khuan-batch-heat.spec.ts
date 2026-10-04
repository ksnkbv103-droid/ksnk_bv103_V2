import { describe, expect, it } from "vitest";
import {
  assertKitFitsSterilizerMethod,
  evaluateBatchSterilizationHeatRisk,
  MSG_HEAT_LOW_TEMP_ONLY,
  MSG_HEAT_STEAM_BLOCK,
  MSG_HEAT_UNKNOWN,
  partitionWaitingKitsByMethod,
  rejectRemoveKitFromBatch,
} from "./me-tiet-khuan-batch-heat";
import type { BomItem } from "@/lib/domain/cssd-packaging-rules";

const steamMachine = { loai_may: { ma_loai_may: "LM_HOI_NUOC" } };

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

const heatTrue = [{ is_chiu_nhiet: true }];
const heatFalse = [{ is_chiu_nhiet: false }];
const heatMissing = [{ is_chiu_nhiet: null }];

describe("lọc danh sách chờ theo phương pháp máy", () => {
  const rows = [
    { id: "steam-ok", lines: heatTrue },
    { id: "plasma-ok", lines: heatFalse },
    { id: "thieu", lines: heatMissing },
  ];

  it("máy hơi nước chỉ hiện bộ chịu nhiệt cao", () => {
    const part = partitionWaitingKitsByMethod(rows, "HOI_NUOC", (row) => ({ lines: row.lines }));
    expect(part.visible.map((row) => row.id)).toEqual(["steam-ok"]);
    expect(part.hiddenCount).toBe(2);
  });

  it("máy Plasma và EO chỉ hiện bộ nhạy nhiệt", () => {
    const plasma = partitionWaitingKitsByMethod(rows, "PLASMA_H2O2", (row) => ({ lines: row.lines }));
    const eo = partitionWaitingKitsByMethod(rows, "EO", (row) => ({ lines: row.lines }));
    expect(plasma.visible.map((row) => row.id)).toEqual(["plasma-ok"]);
    expect(eo.visible.map((row) => row.id)).toEqual(["plasma-ok"]);
    expect(plasma.hiddenCount).toBe(2);
  });

  it("không xác định phương pháp thì ẩn hết", () => {
    const part = partitionWaitingKitsByMethod(rows, null, (row) => ({ lines: row.lines }));
    expect(part.visible).toEqual([]);
    expect(part.hiddenCount).toBe(3);
  });
});

describe("từ chối quét bộ sai phương pháp", () => {
  it("từ chối bộ nhạy nhiệt trên hơi nước và nêu lý do", () => {
    const r = assertKitFitsSterilizerMethod({ method: "HOI_NUOC", lines: heatFalse });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(MSG_HEAT_STEAM_BLOCK);
  });

  it("từ chối bộ chịu nhiệt cao trên Plasma và EO", () => {
    const plasma = assertKitFitsSterilizerMethod({ method: "PLASMA_H2O2", lines: heatTrue });
    const eo = assertKitFitsSterilizerMethod({ method: "EO", lines: heatTrue });
    expect(plasma.ok).toBe(false);
    expect(eo.ok).toBe(false);
    if (!plasma.ok) expect(plasma.message).toBe(MSG_HEAT_LOW_TEMP_ONLY);
  });

  it("fail closed khi thiếu dữ liệu nhiệt", () => {
    expect(assertKitFitsSterilizerMethod({ method: "HOI_NUOC", lines: null, loadError: true }).ok).toBe(false);
    expect(assertKitFitsSterilizerMethod({ method: "PLASMA_H2O2", lines: [] }).ok).toBe(false);
    const missing = assertKitFitsSterilizerMethod({ method: "EO", lines: heatMissing });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.message).toBe(MSG_HEAT_UNKNOWN);
  });

  it("nhận bộ đúng phương pháp", () => {
    expect(assertKitFitsSterilizerMethod({ method: "HOI_NUOC", lines: heatTrue }).ok).toBe(true);
    expect(assertKitFitsSterilizerMethod({ method: "PLASMA_H2O2", lines: heatFalse }).ok).toBe(true);
    expect(assertKitFitsSterilizerMethod({ method: "EO", lines: heatFalse }).ok).toBe(true);
  });
});

describe("bỏ bộ khỏi phiếu", () => {
  it("cho phép khi mẻ đang nạp", () => {
    expect(rejectRemoveKitFromBatch({ tkChotNapAt: null, trangThaiMe: "DANG_CHUAN_NAP" })).toBeNull();
    expect(rejectRemoveKitFromBatch({ tkChotNapAt: null, trangThaiMe: null })).toBeNull();
  });

  it("từ chối sau khi bắt đầu", () => {
    expect(
      rejectRemoveKitFromBatch({ tkChotNapAt: "2026-09-25T10:00:00Z", trangThaiMe: "DANG_TIET_KHUAN" }),
    ).toMatch(/đã bắt đầu/i);
    expect(rejectRemoveKitFromBatch({ tkChotNapAt: null, trangThaiMe: "DANG_TIET_KHUAN" })).toMatch(/đang nạp/i);
  });
});
