import { describe, expect, it } from "vitest";
import { gradeAnswer, scoreAttempt } from "./grade";
import type { DapAnDung, TraLoi } from "./types";

describe("gradeAnswer", () => {
  it("single: đúng / sai / chưa chọn", () => {
    const d: DapAnDung = { kind: "single", optionId: "a" };
    expect(gradeAnswer(d, { kind: "single", optionId: "a" })).toBe(true);
    expect(gradeAnswer(d, { kind: "single", optionId: "b" })).toBe(false);
    expect(gradeAnswer(d, { kind: "single", optionId: null })).toBe(false);
  });

  it("multi: đủ tập (không phụ thuộc thứ tự), thiếu hoặc thừa là sai", () => {
    const d: DapAnDung = { kind: "multi", optionIds: ["a", "c"] };
    expect(gradeAnswer(d, { kind: "multi", optionIds: ["c", "a"] })).toBe(true);
    expect(gradeAnswer(d, { kind: "multi", optionIds: ["a"] })).toBe(false);
    expect(gradeAnswer(d, { kind: "multi", optionIds: ["a", "b", "c"] })).toBe(false);
    expect(gradeAnswer(d, { kind: "multi", optionIds: [] })).toBe(false);
  });

  it("multi: đáp án rỗng trong ngân hàng thì không chấm đúng", () => {
    expect(gradeAnswer({ kind: "multi", optionIds: [] }, { kind: "multi", optionIds: [] })).toBe(false);
  });

  it("true_false_cluster: mọi ý phải khớp, bỏ trống một ý là sai", () => {
    const d: DapAnDung = { kind: "true_false_cluster", byOptionId: { a: true, b: false } };
    expect(gradeAnswer(d, { kind: "true_false_cluster", byOptionId: { a: true, b: false } })).toBe(true);
    expect(gradeAnswer(d, { kind: "true_false_cluster", byOptionId: { a: true, b: true } })).toBe(false);
    expect(gradeAnswer(d, { kind: "true_false_cluster", byOptionId: { a: true, b: null } })).toBe(false);
    expect(gradeAnswer(d, { kind: "true_false_cluster", byOptionId: { a: true } })).toBe(false);
  });

  it("true_false_cluster: thiếu byOptionId (dữ liệu hỏng) chấm sai, không ném lỗi", () => {
    const d: DapAnDung = { kind: "true_false_cluster", byOptionId: { a: true } };
    const hong = { kind: "true_false_cluster" } as unknown as TraLoi;
    expect(() => gradeAnswer(d, hong)).not.toThrow();
    expect(gradeAnswer(d, hong)).toBe(false);
  });

  it("order: đúng thứ tự mới đúng", () => {
    const d: DapAnDung = { kind: "order", orderedOptionIds: ["a", "b", "c"] };
    expect(gradeAnswer(d, { kind: "order", orderedOptionIds: ["a", "b", "c"] })).toBe(true);
    expect(gradeAnswer(d, { kind: "order", orderedOptionIds: ["b", "a", "c"] })).toBe(false);
    expect(gradeAnswer(d, { kind: "order", orderedOptionIds: ["a", "b"] })).toBe(false);
  });

  it("không trả lời hoặc khác loại câu là sai", () => {
    const d: DapAnDung = { kind: "single", optionId: "a" };
    expect(gradeAnswer(d, null)).toBe(false);
    expect(gradeAnswer(d, undefined)).toBe(false);
    expect(gradeAnswer(d, { kind: "multi", optionIds: ["a"] })).toBe(false);
    const hong = { kind: "multi" } as unknown as TraLoi;
    expect(gradeAnswer({ kind: "multi", optionIds: ["a"] }, hong)).toBe(false);
  });
});

describe("scoreAttempt", () => {
  it("đếm câu đúng và % làm tròn 1 chữ số", () => {
    const r = scoreAttempt([
      { dapAnDung: { kind: "single", optionId: "a" }, traLoi: { kind: "single", optionId: "a" } },
      { dapAnDung: { kind: "single", optionId: "a" }, traLoi: null },
      { dapAnDung: { kind: "single", optionId: "a" }, traLoi: { kind: "single", optionId: "b" } },
    ]);
    expect(r).toEqual({ dung: 1, tong: 3, pct: 33.3, flags: [true, false, false] });
  });

  it("bài rỗng: 0%", () => {
    expect(scoreAttempt([])).toEqual({ dung: 0, tong: 0, pct: 0, flags: [] });
  });
});
