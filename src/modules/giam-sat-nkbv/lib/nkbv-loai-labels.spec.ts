import { describe, expect, it } from "vitest";
import {
  formatNkbvChecklistTypeLabel,
  formatNkbvLoaiDisplay,
  nkbvClinicalFormPathway,
  nkbvPersistLoaiCode,
  normalizeNkbvLoaiCode,
  NKBV_CHECKLIST_TYPE_LABELS,
} from "./nkbv-loai-labels";

describe("nkbv-loai-labels", () => {
  it("keeps VAE / VAP / HAP as distinct codes", () => {
    expect(normalizeNkbvLoaiCode("VAE")).toBe("VAE");
    expect(normalizeNkbvLoaiCode("VAP")).toBe("VAP");
    expect(normalizeNkbvLoaiCode("HAP")).toBe("HAP");
    expect(normalizeNkbvLoaiCode("PNEU")).toBe("HAP");
    expect(normalizeNkbvLoaiCode("PVAP")).toBe("VAE");
    expect(normalizeNkbvLoaiCode("PEDVAP")).toBe("VAP");
  });

  it("does not collapse display of respiratory types onto one another", () => {
    expect(formatNkbvLoaiDisplay("VAE", "x")).toBe(NKBV_CHECKLIST_TYPE_LABELS.VAE);
    expect(formatNkbvLoaiDisplay("VAP", "x")).toBe(NKBV_CHECKLIST_TYPE_LABELS.VAP);
    expect(formatNkbvLoaiDisplay("HAP", "x")).toBe(NKBV_CHECKLIST_TYPE_LABELS.HAP);
    expect(formatNkbvLoaiDisplay("VAE", "x")).not.toBe(formatNkbvLoaiDisplay("VAP", "x"));
    expect(formatNkbvChecklistTypeLabel("VAP")).toBe(NKBV_CHECKLIST_TYPE_LABELS.VAP);
  });

  it("routes clinical forms: VAE vs PNEU pathway", () => {
    expect(nkbvClinicalFormPathway("VAE")).toBe("VAE");
    expect(nkbvClinicalFormPathway("VAP")).toBe("PNEU");
    expect(nkbvClinicalFormPathway("HAP")).toBe("PNEU");
    expect(nkbvPersistLoaiCode("VAE")).toBe("VAE");
    expect(nkbvPersistLoaiCode("VAP")).toBe("VAP");
    expect(nkbvPersistLoaiCode("HAP")).toBe("HAP");
  });
});
