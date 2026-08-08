import { describe, expect, it } from "vitest";
import {
  buildSessionIndexSuggestions,
  shouldDeferPrimaryBsi,
  specimenToSyndromePanel,
} from "./nkbv-specimen-syndrome";

describe("nkbv-specimen-syndrome", () => {
  it("maps specimen to panel", () => {
    expect(specimenToSyndromePanel({ loai_benh_pham: "Đờm" })).toBe("PNEU");
    expect(specimenToSyndromePanel({ loai_benh_pham: "Nước tiểu" })).toBe("UTI");
    expect(specimenToSyndromePanel({ loai_benh_pham: "Máu" })).toBe("BSI");
    expect(specimenToSyndromePanel({ loai_benh_pham: "Dịch vết mổ" })).toBe("SSI");
    expect(specimenToSyndromePanel({ loai_benh_pham: "Đờm", preferVae: true })).toBe("VAE");
  });

  it("defers Primary Bsi when site panel open", () => {
    expect(
      shouldDeferPrimaryBsi({ selectedSpecimenPanel: "BSI", activeSitePanel: "PNEU" }),
    ).toBe(true);
    expect(
      shouldDeferPrimaryBsi({ selectedSpecimenPanel: "BSI", activeSitePanel: null }),
    ).toBe(false);
  });

  it("gợi ý phiên chỉ từ XN / CĐHA / TC SSI đúng map domain", () => {
    const list = buildSessionIndexSuggestions({
      xn: [
        {
          id: "xn-urine",
          ngay: "2026-08-02",
          benh_pham: "Nước tiểu",
          vi_khuan: "E. coli",
          so_luong: "10^5",
          source: "LIS",
        },
        {
          id: "xn-blood",
          ngay: "2026-08-03",
          benh_pham: "Máu",
          vi_khuan: "S. aureus",
          so_luong: null,
          source: "LIS",
        },
      ],
      cdha: [
        {
          id: "xq1",
          ngay: "2026-08-01",
          loai: "XQ",
          mo_ta_benh_ly: "XQ phổi thâm nhiễm",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      surgeryByDate: {
        "2026-07-20": [{ key: "procedure_surgery", label: "Ngày mổ", id: "surg1" }],
      },
      ssiTcByDate: {
        "2026-07-25": [
          { key: "purulent_drainage", label: "Chảy mủ", id: "tc1" },
          { key: "rales", label: "Ran (không phải Index SSI)", id: "tc-wrong" },
        ],
      },
      preferVae: false,
    });
    const panels = list.map((s) => `${s.panel}:${s.source}`);
    expect(panels).toContain("UTI:XN");
    expect(panels).toContain("BSI:XN");
    expect(panels).toContain("PNEU:CDHA");
    expect(panels).toContain("SSI:SURGERY");
    expect(panels).toContain("SSI:SSI_TC");
    // Không gợi ý từ TC không thuộc tiêu chuẩn SSI
    expect(list.some((s) => s.index.id === "tc-wrong")).toBe(false);
    // Không bịa UTI từ XN máu
    expect(list.some((s) => s.panel === "UTI" && s.index.id === "xn-blood")).toBe(false);
  });

  it("bỏ qua Index tạm local- và không gợi ý CĐHA ngoài phổi/áp xe", () => {
    const list = buildSessionIndexSuggestions({
      xn: [
        {
          id: "local-xn-1",
          ngay: "2026-08-02",
          benh_pham: "Nước tiểu",
          vi_khuan: "",
          so_luong: "",
          source: "MANUAL",
        },
      ],
      cdha: [
        {
          id: "xq-other",
          ngay: "2026-08-01",
          loai: "XQ",
          mo_ta_benh_ly: "XQ bụng",
          tieu_chuan_key: "obgyn_abdominal_pain",
        },
        {
          id: "local-cdha-1",
          ngay: "2026-08-01",
          loai: "XQ",
          mo_ta_benh_ly: "XQ phổi",
          tieu_chuan_key: "imaging_chest",
        },
      ],
      surgeryByDate: {},
      ssiTcByDate: {},
    });
    expect(list).toHaveLength(0);
  });
});
