import { describe, expect, it } from "vitest";
import {
  hydrateLamSangDraftFromBa,
  mergeLamSangByDate,
  pickLamSangInDates,
  provisionalIwpDateSet,
} from "./nkbv-ba-lam-sang-merge";

describe("mergeLamSangByDate", () => {
  it("ưu tiên BA khi trùng key; gộp ngày", () => {
    const merged = mergeLamSangByDate(
      { "2026-07-20": [{ key: "fever", label: "Sốt BA", id: "ba-1" }] },
      {
        "2026-07-20": [{ key: "fever", label: "Sốt draft" }],
        "2026-07-21": [{ key: "dysuria", label: "Buốt" }],
      },
    );
    expect(merged["2026-07-20"]).toEqual([{ key: "fever", label: "Sốt BA", id: "ba-1" }]);
    expect(merged["2026-07-21"]?.[0]?.key).toBe("dysuria");
  });
});

describe("hydrateLamSangDraftFromBa (IWP Index mới)", () => {
  it("provisional IWP Index±3", () => {
    const s = provisionalIwpDateSet("2026-07-23");
    expect(s.has("2026-07-20")).toBe(true);
    expect(s.has("2026-07-23")).toBe(true);
    expect(s.has("2026-07-26")).toBe(true);
    expect(s.has("2026-07-19")).toBe(false);
  });

  it("pickLamSangInDates chỉ lấy ngày trong cửa sổ", () => {
    const picked = pickLamSangInDates(
      {
        "2026-07-20": [{ key: "fever", label: "Sốt" }],
        "2026-07-10": [{ key: "dysuria", label: "Buốt" }],
      },
      provisionalIwpDateSet("2026-07-23"),
    );
    expect(picked["2026-07-20"]?.[0]?.key).toBe("fever");
    expect(picked["2026-07-10"]).toBeUndefined();
  });

  it("hydrate đưa LS BA ∈ IWP vào draft trống (sự kiện Index mới)", () => {
    const { next, changed } = hydrateLamSangDraftFromBa({
      ba: {
        "2026-07-22": [{ key: "fever", label: "Sốt >38", id: "ba-f" }],
        "2026-07-10": [{ key: "dysuria", label: "Ngoài IWP" }],
      },
      draft: {},
      indexDate: "2026-07-25",
    });
    expect(changed).toBe(true);
    expect(next["2026-07-22"]?.[0]?.key).toBe("fever");
    expect(next["2026-07-10"]).toBeUndefined();
  });

  it("đã có đủ key trong draft → không changed", () => {
    const { changed } = hydrateLamSangDraftFromBa({
      ba: { "2026-07-22": [{ key: "fever", label: "Sốt", id: "ba-f" }] },
      draft: { "2026-07-22": [{ key: "fever", label: "Sốt" }] },
      indexDate: "2026-07-25",
    });
    expect(changed).toBe(false);
  });
});
