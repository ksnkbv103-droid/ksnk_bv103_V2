import { describe, expect, it } from "vitest";
import {
  inferChecklistTypeFromSpecimen,
  resolveMdmLoaiId,
  suggestNkbvTypeFromSpecimen,
  lockedCaseChecklistType,
  initialSuspectedChecklistType,
} from "./nkbv-loai-labels";

describe("inferChecklistTypeFromSpecimen", () => {
  it("maps urine to UTI", () => {
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Nước tiểu giữa dòng" })).toBe("UTI");
  });

  it("maps blood to BSI", () => {
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Máu ngoại vi" })).toBe("BSI");
  });

  it("maps sputum/BAL to HAP", () => {
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Đờm / BAL" })).toBe("HAP");
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Đờm mủ" })).toBe("HAP");
  });

  it("maps wound fluid to SSI", () => {
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Dịch vết mổ" })).toBe("SSI");
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Mủ vết mổ" })).toBe("SSI");
  });

  it("does not treat bare pus as SSI", () => {
    expect(inferChecklistTypeFromSpecimen({ loai_benh_pham: "Mủ" })).toBe("BSI");
  });

  it("UR / URT / USI → Chương 17, không UTI hay HAP", () => {
    expect(
      inferChecklistTypeFromSpecimen({
        loai_benh_pham: "Dịch hầu họng (UR, không phải nước tiểu)",
        loai_benh_pham_chuan: "URT",
      }),
    ).toBe("CH17");
    expect(
      inferChecklistTypeFromSpecimen({
        loai_benh_pham: "Dịch / mô thận (không phải nước tiểu)",
        loai_benh_pham_chuan: "SURGICAL_SITE_FLUID",
        lis_goc: "Dịch / mô thận (không phải nước tiểu)",
      }),
    ).toBe("CH17");
  });
});

describe("suggestNkbvTypeFromSpecimen", () => {
  it("prefers specimen over wrong SSI loai_ma", () => {
    const r = suggestNkbvTypeFromSpecimen({
      loai_benh_pham: "Cấy máu (Blood)",
      loai_ma: "SSI",
    });
    expect(r.type).toBe("BSI");
    expect(r.reason).toMatch(/bỏ qua mã phiếu/i);
  });

  it("maps urine with SSI loai_ma to UTI", () => {
    const r = suggestNkbvTypeFromSpecimen({
      loai_benh_pham: "Urine (Nước tiểu)",
      loai_ma: "SSI",
    });
    expect(r.type).toBe("UTI");
  });

  it("maps sputum to HAP with vent hint", () => {
    const r = suggestNkbvTypeFromSpecimen({ loai_benh_pham: "Đờm (Sputum)" });
    expect(r.type).toBe("HAP");
    expect(r.reason).toMatch(/VAE|VAP/i);
  });
});

describe("resolveMdmLoaiId", () => {
  const cats = [
    { id: "1", ma_loai: "SSI" },
    { id: "2", ma_loai: "CLABSI" },
    { id: "3", ma_loai: "CAUTI" },
    { id: "4", ma_loai: "VAP" },
    { id: "5", ma_loai: "KHAC" },
  ];

  it("resolves BSI via CLABSI alias without falling back to SSI", () => {
    expect(resolveMdmLoaiId("BSI", cats)).toBe("2");
  });

  it("resolves UTI via CAUTI", () => {
    expect(resolveMdmLoaiId("UTI", cats)).toBe("3");
  });

  it("resolves HAP via VAP when HAP missing", () => {
    expect(resolveMdmLoaiId("HAP", cats)).toBe("4");
  });

  it("returns KHAC when no alias matches", () => {
    expect(resolveMdmLoaiId("VAE", cats)).toBe("5");
  });

  it("returns null when no categories and no KHAC", () => {
    expect(resolveMdmLoaiId("BSI", [{ id: "1", ma_loai: "SSI" }], false)).toBe(null);
  });
});

describe("lockedCaseChecklistType / initialSuspectedChecklistType", () => {
  it("khóa loại phiếu, không đổi theo bệnh phẩm lệch", () => {
    expect(lockedCaseChecklistType({ loai_ma: "UTI" })).toBe("UTI");
    expect(initialSuspectedChecklistType("UTI", "HAP")).toBe("UTI");
  });

  it("chưa gắn loại → theo gợi ý", () => {
    expect(lockedCaseChecklistType({ loai_ma: null })).toBe(null);
    expect(initialSuspectedChecklistType(null, "BSI")).toBe("BSI");
  });
});
