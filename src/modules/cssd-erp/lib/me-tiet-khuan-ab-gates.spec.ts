import { describe, expect, it } from "vitest";
import { recallTargetStationForLotMember, selectBiRecallBatchIds } from "@/modules/cssd-su-co/domain/cssd-batch-recall";
import { biRequiredForBatch, evaluateMeQcRelease } from "./me-tiet-khuan-qc";
import { assertKitFitsSterilizerMethod } from "./me-tiet-khuan-batch-heat";
import {
  AB1_FAIL_TARGET_STATION,
  assertImplantReleaseWithoutBiBlocked,
  isEmergencyImplantReleaseAllowed,
  MSG_NO_EMERGENCY_IMPLANT_RELEASE,
  meQcPassNeedsNhaImplant,
  requiresNhaImplantRight,
  requiresToTruongReleaseRight,
} from "./me-tiet-khuan-ab-gates";

const baseQc = {
  thongSoVatLy: "DAT" as const,
  ciNgoaiGoi: "DAT" as const,
  ciPcd: "DAT" as const,
  nhietDo: "134",
  apSuat: "2.1",
  thoiGianChuKy: "20",
};

describe("18b A×6 Soft gates", () => {
  it("AB-1: fail/recall target is TIEP_NHAN (not DONG_GOI)", () => {
    expect(AB1_FAIL_TARGET_STATION).toBe("TIEP_NHAN");
    expect(recallTargetStationForLotMember("CAP_PHAT")).toBe("TIEP_NHAN");
    expect(recallTargetStationForLotMember("DONG_GOI")).toBe("TIEP_NHAN");
  });

  it("AB-2: no emergency implant release; implant + BI chưa có → CHO_BI not HOAN_THANH", () => {
    expect(isEmergencyImplantReleaseAllowed()).toBe(false);
    const held = evaluateMeQcRelease({
      ...baseQc,
      trangThaiBi: "CHUA_CO",
      method: "HOI_NUOC",
      coImplant: true,
    });
    expect(held.ok && held.decision.outcome).toBe("CHO_BI");
    expect(
      assertImplantReleaseWithoutBiBlocked({
        coImplant: true,
        trangThaiBi: "CHUA_CO",
        outcome: "HOAN_THANH",
      }).ok,
    ).toBe(false);
    expect(
      assertImplantReleaseWithoutBiBlocked({
        coImplant: true,
        trangThaiBi: "AM",
        outcome: "HOAN_THANH",
      }).ok,
    ).toBe(true);
    expect(MSG_NO_EMERGENCY_IMPLANT_RELEASE).toMatch(/không được nhả khẩn/i);
    expect(MSG_NO_EMERGENCY_IMPLANT_RELEASE).not.toMatch(/Soft/);
  });

  it("AB-3: BI+ recall window is machine-scoped for any PP (no method filter)", () => {
    const batches = [
      { id: "a", thietBiId: "may", at: "2026-09-01T00:00:00.000Z", trangThaiBi: "AM" },
      { id: "b", thietBiId: "may", at: "2026-09-02T00:00:00.000Z", trangThaiBi: "CHUA_CO" },
      { id: "c", thietBiId: "may", at: "2026-09-03T00:00:00.000Z", trangThaiBi: "DUONG" },
      { id: "d", thietBiId: "may", at: "2026-09-04T00:00:00.000Z", trangThaiBi: "CHUA_CO" },
    ];
    expect(selectBiRecallBatchIds(batches, "c")).toEqual(["b", "c"]);
  });

  it("AB-4: Plasma/EO BI bắt buộc → CHO_BI until BI âm", () => {
    expect(biRequiredForBatch("PLASMA_H2O2", false)).toBe(true);
    expect(biRequiredForBatch("EO", false)).toBe(true);
    expect(biRequiredForBatch("HOI_NUOC", false)).toBe(false);
    const plasma = evaluateMeQcRelease({
      ...baseQc,
      trangThaiBi: "CHUA_CO",
      method: "PLASMA_H2O2",
      nhietDo: "",
      apSuat: "",
      thoiGianChuKy: "",
    });
    expect(plasma.ok && plasma.decision.outcome).toBe("CHO_BI");
  });

  it("AB-5: wrong PP / heat class hard-blocks on scan gate", () => {
    const steamBlock = assertKitFitsSterilizerMethod({
      method: "HOI_NUOC",
      lines: [{ is_chiu_nhiet: false }],
    });
    expect(steamBlock.ok).toBe(false);
    const plasmaBlock = assertKitFitsSterilizerMethod({
      method: "PLASMA_H2O2",
      lines: [{ is_chiu_nhiet: true }],
    });
    expect(plasmaBlock.ok).toBe(false);
    expect(
      assertKitFitsSterilizerMethod({ method: "HOI_NUOC", lines: [{ is_chiu_nhiet: true }] }).ok,
    ).toBe(true);
  });

  it("AB-6: tổ trưởng right for implant HOAN_THANH and CHO_BI release only", () => {
    expect(requiresToTruongReleaseRight({ coImplant: false, outcome: "HOAN_THANH" })).toBe(false);
    expect(requiresToTruongReleaseRight({ coImplant: true, outcome: "HOAN_THANH" })).toBe(true);
    expect(requiresToTruongReleaseRight({ coImplant: true, outcome: "CHO_BI" })).toBe(false);
    expect(requiresToTruongReleaseRight({ releasingFromChoBi: true })).toBe(true);
    expect(requiresToTruongReleaseRight({ coImplant: false, outcome: "QC_KHONG_DAT" })).toBe(false);
  });

  it("ME-04: nha_implant for implant/Plasma·EO đạt, ghi CHO_BI, nhập BI âm", () => {
    expect(requiresNhaImplantRight({ coImplant: false, biBatBuoc: false, outcome: "HOAN_THANH" })).toBe(false);
    expect(requiresNhaImplantRight({ coImplant: true, outcome: "HOAN_THANH" })).toBe(true);
    expect(requiresNhaImplantRight({ biBatBuoc: true, outcome: "HOAN_THANH" })).toBe(true);
    expect(requiresNhaImplantRight({ outcome: "CHO_BI" })).toBe(true);
    expect(requiresNhaImplantRight({ releasingFromChoBi: true })).toBe(true);
  });

  it("nhả QC: implant hoặc BI bắt buộc cần quyền; hơi nước thường thì không", () => {
    expect(meQcPassNeedsNhaImplant({ coImplant: false, biBatBuoc: false, trangThaiBi: "CHUA_CO" })).toBe(false);
    expect(meQcPassNeedsNhaImplant({ coImplant: true, biBatBuoc: true, trangThaiBi: "AM" })).toBe(true);
    expect(meQcPassNeedsNhaImplant({ biBatBuoc: true, trangThaiBi: "DANG_U" })).toBe(true);
    expect(meQcPassNeedsNhaImplant({ biBatBuoc: true, trangThaiBi: "" })).toBe(true);
  });
});
