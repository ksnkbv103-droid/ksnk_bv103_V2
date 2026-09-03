import { describe, expect, it } from "vitest";
import {
  buildSessionIndexSuggestions,
  cdhaToSyndromePanel,
  firstActiveSitePanel,
  isSsiIndexCriteriaKey,
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
    expect(specimenToSyndromePanel({ loai_benh_pham_chuan: "URT" })).toBeNull();
    expect(
      specimenToSyndromePanel({
        lis_goc: "Dịch / mô thận (USI, không phải nước tiểu)",
        loai_benh_pham_chuan: "SURGICAL_SITE_FLUID",
      }),
    ).toBeNull();
  });

  it("maps CĐHA Index đúng domain", () => {
    expect(cdhaToSyndromePanel({ tieu_chuan_key: "imaging_chest" })).toBe("PNEU");
    expect(cdhaToSyndromePanel({ tieu_chuan_key: "imaging_chest", preferVae: true })).toBe(
      "VAE",
    );
    expect(cdhaToSyndromePanel({ tieu_chuan_key: "abscess_imaging" })).toBe("SSI");
    expect(cdhaToSyndromePanel({ tieu_chuan_key: "fever" })).toBeNull();
  });

  it("chỉ nhận TC DOE SSI / ngày mổ làm Index SSI", () => {
    expect(isSsiIndexCriteriaKey("procedure_surgery")).toBe(true);
    expect(isSsiIndexCriteriaKey("purulent_drainage")).toBe(true);
    expect(isSsiIndexCriteriaKey("rales")).toBe(false);
    expect(isSsiIndexCriteriaKey("uuid-free-text")).toBe(false);
  });

  it("defers Primary BSI chỉ khi máu ∈ SBAP site đủ TC (không chặn thô theo phiên)", () => {
    expect(
      shouldDeferPrimaryBsi({
        selectedSpecimenPanel: "BSI",
        bloodDate: "2026-07-20",
        establishedSiteSbaps: [{ start: "2026-07-15", end: "2026-07-30" }],
      }),
    ).toBe(true);
    expect(
      shouldDeferPrimaryBsi({
        selectedSpecimenPanel: "BSI",
        bloodDate: "2026-08-01",
        establishedSiteSbaps: [{ start: "2026-07-15", end: "2026-07-30" }],
      }),
    ).toBe(false);
    // fallback tương thích cũ
    expect(
      shouldDeferPrimaryBsi({ selectedSpecimenPanel: "BSI", activeSitePanel: "UTI" }),
    ).toBe(true);
    expect(
      shouldDeferPrimaryBsi({ selectedSpecimenPanel: "BSI", activeSitePanel: null }),
    ).toBe(false);
    expect(firstActiveSitePanel(["BSI", "UTI", "PNEU"])).toBe("UTI");
    expect(firstActiveSitePanel(["BSI"])).toBeNull();
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
    expect(list.some((s) => s.index.id === "tc-wrong")).toBe(false);
    expect(list.some((s) => s.panel === "UTI" && s.index.id === "xn-blood")).toBe(false);
  });

  it("chỉ gợi ý XN chưa phân tích khi có trạng thái hàng đợi", () => {
    const list = buildSessionIndexSuggestions({
      xn: [
        {
          id: "xn-pending",
          ngay: "2026-08-02",
          benh_pham: "Nước tiểu",
          vi_khuan: "E. coli",
          so_luong: null,
          source: "LIS",
        },
        {
          id: "xn-done",
          ngay: "2026-08-01",
          benh_pham: "Đờm",
          vi_khuan: "K. pneumoniae",
          so_luong: null,
          source: "LIS",
        },
        {
          id: "xn-skip",
          ngay: "2026-08-03",
          benh_pham: "Máu",
          vi_khuan: "S. aureus",
          so_luong: null,
          source: "LIS",
        },
      ],
      cdha: [],
      surgeryByDate: {},
      ssiTcByDate: {},
      xnStatusById: {
        "xn-pending": "CHUA_PHAN_TICH",
        "xn-done": "DA_PHAN_TICH",
        "xn-skip": "BO_QUA",
      },
      onlyPendingXn: true,
    });
    expect(list.map((s) => s.index.id)).toEqual(["xn-pending"]);
  });

  it("bỏ qua Index tạm local- và không gợi ý CĐHA ngoài phổi/áp xe", () => {
    const list = buildSessionIndexSuggestions({
      xn: [
        {
          id: "local-xn-1",
          ngay: "2026-08-02",
          benh_pham: "Nước tiểu",
          vi_khuan: "",
          so_luong: null,
          source: "MANUAL",
        },
      ],
      cdha: [
        {
          id: "xq-other",
          ngay: "2026-08-01",
          loai: "XQ",
          mo_ta_benh_ly: "XQ bụng",
          tieu_chuan_key: "fever",
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
