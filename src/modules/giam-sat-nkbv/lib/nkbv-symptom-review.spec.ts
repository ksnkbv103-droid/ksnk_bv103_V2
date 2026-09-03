import { describe, expect, it } from "vitest";
import {
  booleanFieldsFromSymptomDates,
  parseSymptomReviewMap,
  patchSymptomReview,
  mergeFormSymptomBooleans,
} from "./nkbv-symptom-review";

describe("nkbv-symptom-review", () => {
  it("parse map rỗng / lệch kiểu", () => {
    expect(parseSymptomReviewMap(null)).toEqual({});
    expect(parseSymptomReviewMap({ has_fever: { confirmed: "dung", note: "gọi khoa" } })).toEqual({
      has_fever: { confirmed: "dung", note: "gọi khoa" },
    });
  });

  it("patch không mất ghi chú", () => {
    const next = patchSymptomReview(
      { has_fever: { confirmed: "chua", note: "chờ khoa" } },
      "has_fever",
      { confirmed: "dung" },
    );
    expect(next.has_fever).toEqual({ confirmed: "dung", note: "chờ khoa" });
  });

  it("ngày mốc → cờ form", () => {
    expect(booleanFieldsFromSymptomDates({ has_fever: "2026-08-16", has_dysuria: "" })).toEqual({
      has_fever: true,
      has_dysuria: false,
    });
  });

  it("merge cờ vào form", () => {
    expect(
      mergeFormSymptomBooleans({ has_fever: false, other: 1 }, { has_fever: "2026-08-16" }),
    ).toEqual({ has_fever: true, other: 1 });
  });
});
