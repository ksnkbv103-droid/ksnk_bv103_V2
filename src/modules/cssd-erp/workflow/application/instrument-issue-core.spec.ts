import { describe, expect, it } from "vitest";
import { removeChiTietIssueNoteLines } from "./instrument-issue-core";

const NOTE = [
  "nguon=DCPT_bo_sung; tu_sinh",
  "[MAT] 2026-11-10 22:54:21 (SL 1/2) - UAT: mất 1 cán dao",
  "[HONG] 2026-11-10 23:00:00 - phiếu khác",
].join("\n");

describe("removeChiTietIssueNoteLines", () => {
  it("chỉ gỡ dòng khớp loại + mốc giây, giữ ghi chú gốc và phiếu khác", () => {
    const out = removeChiTietIssueNoteLines(NOTE, [{ issueType: "MAT", createdAt: "2026-11-10T22:54:21.244451+00:00" }]);
    expect(out).toBe("nguon=DCPT_bo_sung; tu_sinh\n[HONG] 2026-11-10 23:00:00 - phiếu khác");
  });

  it("không khớp loại thì giữ nguyên", () => {
    const out = removeChiTietIssueNoteLines(NOTE, [{ issueType: "HONG", createdAt: "2026-11-10T22:54:21Z" }]);
    expect(out).toBe(NOTE);
  });

  it("gỡ hết thì trả chuỗi rỗng", () => {
    const out = removeChiTietIssueNoteLines("[MAT] 2026-11-10 22:54:21", [{ issueType: "MAT", createdAt: "2026-11-10T22:54:21Z" }]);
    expect(out).toBe("");
  });
});
