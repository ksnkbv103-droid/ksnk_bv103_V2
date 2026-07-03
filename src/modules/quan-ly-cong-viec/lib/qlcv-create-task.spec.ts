import { describe, expect, it } from "vitest";
import {
  assertQlcvHanHoanThanhChangeAllowed,
  assertQlcvHanHoanThanhNotPast,
  normalizeQlcvHanDate,
} from "./qlcv-create-task";

describe("qlcv han validation", () => {
  it("normalizeQlcvHanDate strips time", () => {
    expect(normalizeQlcvHanDate("2026-06-07T00:00:00+00:00")).toBe("2026-06-07");
  });

  it("assertQlcvHanHoanThanhChangeAllowed keeps unchanged past deadline", () => {
    expect(() => assertQlcvHanHoanThanhChangeAllowed("2026-06-07", "2026-06-07T00:00:00Z")).not.toThrow();
  });

  it("assertQlcvHanHoanThanhChangeAllowed blocks new past deadline", () => {
    expect(() => assertQlcvHanHoanThanhChangeAllowed("2020-01-01", "2026-06-07")).toThrow(
      "Hạn hoàn thành mới không được trước ngày hôm nay.",
    );
  });

  it("assertQlcvHanHoanThanhNotPast blocks create with past date", () => {
    expect(() => assertQlcvHanHoanThanhNotPast("2020-01-01")).toThrow(
      "Hạn hoàn thành không được trước ngày hôm nay.",
    );
  });
});
