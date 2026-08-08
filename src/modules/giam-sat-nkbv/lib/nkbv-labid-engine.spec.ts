import { describe, expect, it } from "vitest";
import { evaluateLabidEvent, inferSpecimenClassFromBenhPham } from "./nkbv-labid-engine";

describe("nkbv-labid-engine", () => {
  it("creates MRSA LabID from blood + phenotype", () => {
    const res = evaluateLabidEvent({
      phenotype: "MRSA",
      organismName: "Staphylococcus aureus",
      specimenClass: "BLOOD",
      collectionDate: "2026-08-01",
    });
    expect(res.isEvent).toBe(true);
    expect(res.eventType).toBe("LABID_MRSA");
  });

  it("blocks duplicate within 14 days", () => {
    const res = evaluateLabidEvent({
      phenotype: "MRSA",
      organismName: "S. aureus",
      specimenClass: "BLOOD",
      collectionDate: "2026-08-05",
      priorSamePhenotypeWithin14d: true,
    });
    expect(res.isEvent).toBe(false);
    expect(res.eventType).toBe("DUPLICATE_14D");
  });

  it("creates CDI LabID from stool + assay", () => {
    const res = evaluateLabidEvent({
      phenotype: "CDI",
      organismName: "C. difficile",
      specimenClass: "STOOL",
      collectionDate: "2026-08-01",
      cdiAssayPositive: true,
    });
    expect(res.isEvent).toBe(true);
    expect(res.eventType).toBe("LABID_CDI");
  });

  it("does not create MRSA LabID from non-blood", () => {
    const res = evaluateLabidEvent({
      phenotype: "MRSA",
      organismName: "S. aureus",
      specimenClass: "OTHER",
      collectionDate: "2026-08-01",
    });
    expect(res.isEvent).toBe(false);
  });

  it("infers specimen class", () => {
    expect(inferSpecimenClassFromBenhPham("Máu")).toBe("BLOOD");
    expect(inferSpecimenClassFromBenhPham("Phân")).toBe("STOOL");
  });
});
