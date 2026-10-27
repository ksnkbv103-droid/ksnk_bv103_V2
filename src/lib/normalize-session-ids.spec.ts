import { describe, expect, it } from "vitest";
import { MAX_SESSION_IDS_PER_CALL, normalizeSessionIds } from "./normalize-session-ids";

describe("normalizeSessionIds", () => {
  it("bỏ rỗng và trùng", () => {
    expect(normalizeSessionIds([" a ", "", "a", "b"])).toEqual({ ok: true, ids: ["a", "b"] });
  });
  it("null → rỗng", () => {
    expect(normalizeSessionIds(null)).toEqual({ ok: true, ids: [] });
  });
  it("vượt trần → lỗi", () => {
    const many = Array.from({ length: MAX_SESSION_IDS_PER_CALL + 1 }, (_, i) => `id${i}`);
    expect(normalizeSessionIds(many).ok).toBe(false);
  });
});
