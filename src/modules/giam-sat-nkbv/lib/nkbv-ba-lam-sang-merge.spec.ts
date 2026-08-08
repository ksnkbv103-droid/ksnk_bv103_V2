import { describe, expect, it } from "vitest";
import { mergeLamSangByDate } from "./nkbv-ba-lam-sang-merge";

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
