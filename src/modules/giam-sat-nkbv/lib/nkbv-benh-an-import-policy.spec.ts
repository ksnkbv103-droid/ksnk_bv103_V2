import { describe, expect, it } from "vitest";
import { decideBenhAnImportRow } from "./nkbv-benh-an-import-policy";

describe("decideBenhAnImportRow", () => {
  it("chưa có mã → tạo", () => {
    expect(decideBenhAnImportRow({ existingPid: null, incomingPid: "BN1" })).toBe("insert");
  });
  it("đã có mã → không đè", () => {
    expect(decideBenhAnImportRow({ existingPid: "BN1", incomingPid: "BN1" })).toBe("skip_exists");
  });
  it("cùng BA khác PID → bỏ qua xung đột", () => {
    expect(decideBenhAnImportRow({ existingPid: "BN1", incomingPid: "BN2" })).toBe("skip_conflict");
  });
});
