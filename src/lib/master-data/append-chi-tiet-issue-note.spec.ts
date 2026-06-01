import { describe, expect, it } from "vitest";

describe("appendChiTietIssueNoteAction contract", () => {
  it("exports server action symbol", async () => {
    const mod = await import("./append-chi-tiet-issue-note.action");
    expect(typeof mod.appendChiTietIssueNoteAction).toBe("function");
  });
});
