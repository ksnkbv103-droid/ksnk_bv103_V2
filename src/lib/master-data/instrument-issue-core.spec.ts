import { describe, expect, it } from "vitest";
import { buildChiTietIssueNoteText } from "./instrument-issue-core";

describe("buildChiTietIssueNoteText", () => {
  const now = "2026-06-02 10:00:00";

  it("appends issue line and detach when chi tiết thuộc bộ", () => {
    const text = buildChiTietIssueNoteText({
      issueType: "HONG",
      note: "gãy đầu",
      oldNote: "Ghi cũ",
      oldBoId: "bo-1",
      now,
    });
    expect(text).toContain("[HONG] 2026-06-02 10:00:00 - gãy đầu");
    expect(text).toContain("Tách khỏi bộ hiện tại do báo hỏng");
    expect(text.startsWith("Ghi cũ\n")).toBe(true);
  });

  it("omits detach line when chi tiết chưa gán bộ", () => {
    const text = buildChiTietIssueNoteText({
      issueType: "MAT",
      oldNote: "",
      oldBoId: "",
      now,
    });
    expect(text).toBe("[MAT] 2026-06-02 10:00:00");
  });
});

describe("reportChiTietInstrumentIssueAction contract", () => {
  it("exports orchestrator and legacy alias", async () => {
    const mod = await import("./append-chi-tiet-issue-note.action");
    expect(typeof mod.reportChiTietInstrumentIssueAction).toBe("function");
    expect(typeof mod.appendChiTietIssueNoteAction).toBe("function");
  });
});
