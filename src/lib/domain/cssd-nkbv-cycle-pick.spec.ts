import { describe, expect, it } from "vitest";
import {
  cssdCycleAnchorYmd,
  pickCssdCycleBySurgeryDate,
  type CssdNkbvCyclePickCandidate,
} from "./cssd-nkbv-cycle-pick";

describe("pickCssdCycleBySurgeryDate", () => {
  const base = (id: string, cap: string | null, used: string | null): CssdNkbvCyclePickCandidate => ({
    id,
    thoiGianCapPhat: cap,
    usedClinicallyAt: used,
  });

  it("prefers used_clinically_at over cap_phat for anchor", () => {
    expect(
      cssdCycleAnchorYmd(
        base("a", "2026-07-01T08:00:00.000Z", "2026-07-03T10:00:00.000Z"),
      ),
    ).toBe("2026-07-03");
  });

  it("picks cycle with latest anchor on or before surgery", () => {
    const picked = pickCssdCycleBySurgeryDate(
      [
        base("old", "2026-06-01T00:00:00.000Z", null),
        base("mid", "2026-07-01T00:00:00.000Z", null),
        base("after", "2026-08-01T00:00:00.000Z", null),
        base("on-day", "2026-07-10T12:00:00.000Z", null),
      ],
      "2026-07-10",
    );
    expect(picked?.id).toBe("on-day");
  });

  it("ignores cycles with anchor strictly after surgery", () => {
    const picked = pickCssdCycleBySurgeryDate(
      [base("future", "2026-08-01T00:00:00.000Z", null)],
      "2026-07-10",
    );
    expect(picked).toBeNull();
  });

  it("returns null when surgery date invalid", () => {
    expect(pickCssdCycleBySurgeryDate([base("a", "2026-07-01T00:00:00.000Z", null)], "bad")).toBeNull();
  });
});
