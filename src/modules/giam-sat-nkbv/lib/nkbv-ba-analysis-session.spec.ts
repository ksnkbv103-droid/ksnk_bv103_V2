import { describe, expect, it } from "vitest";
import {
  formatSessionChipLabel,
  sessionIdForIndex,
  type BaAnalysisSession,
} from "./nkbv-ba-analysis-session";

describe("nkbv-ba-analysis-session", () => {
  it("id phiên = panel:indexId", () => {
    expect(sessionIdForIndex("PNEU", "lis:1")).toBe("PNEU:lis:1");
    expect(sessionIdForIndex("UTI", "xn-2")).toBe("UTI:xn-2");
  });

  it("chip label gồm panel + ngày + nhãn Index", () => {
    const s: BaAnalysisSession = {
      id: "PNEU:a",
      panel: "PNEU",
      index: { kind: "XN", id: "a", date: "2026-07-20" },
      indexLabel: "đờm",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      draft: {
        lamSang: {},
        bloodCriterionIds: [],
        ketLuan: "",
        notesByDate: {},
        readyToChot: false,
        canThiepDates: [],
      },
    };
    expect(formatSessionChipLabel(s)).toBe("PNEU 20/7 · đờm");
  });
});
