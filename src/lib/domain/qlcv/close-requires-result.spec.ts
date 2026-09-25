import { describe, expect, it } from "vitest";
import {
  hasQlcvChecklistFullResult,
  validateQlcvCloseRequiresResult,
} from "./close-requires-result";

describe("validateQlcvCloseRequiresResult (19c TAC-3A)", () => {
  it("allows checklist 100%", () => {
    const checklist = [
      { id: "1", label: "A", done: true },
      { id: "2", label: "B", done: true },
    ];
    expect(hasQlcvChecklistFullResult(checklist)).toBe(true);
    expect(validateQlcvCloseRequiresResult({ checklist })).toBeNull();
  });

  it("allows one-line ket qua when no full checklist", () => {
    expect(
      validateQlcvCloseRequiresResult({
        checklist: [],
        ketQuaText: " Đã bàn giao biên bản ",
      }),
    ).toBeNull();
  });

  it("rejects empty result when checklist incomplete", () => {
    const checklist = [{ id: "1", label: "A", done: false }];
    expect(validateQlcvCloseRequiresResult({ checklist, ketQuaText: "  " })).toMatch(/kết quả/i);
    expect(validateQlcvCloseRequiresResult({ checklist: null, ketQuaText: "" })).toMatch(/kết quả/i);
  });
});
