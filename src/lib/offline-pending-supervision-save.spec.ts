import { describe, expect, it } from "vitest";
import { buildFlushOpts, isPermanentSupervisionFlushError } from "./offline-pending-supervision-save";
import { SUPERVISION_SESSION_MUTATION_EXPIRED_VI } from "./supervision-mutation-window";

describe("isPermanentSupervisionFlushError", () => {
  it("true khi quá cửa sổ sửa 30 phút", () => {
    expect(isPermanentSupervisionFlushError(SUPERVISION_SESSION_MUTATION_EXPIRED_VI)).toBe(true);
  });
  it("false với lỗi tạm thời hoặc rỗng", () => {
    expect(isPermanentSupervisionFlushError("Failed to fetch")).toBe(false);
    expect(isPermanentSupervisionFlushError(undefined)).toBe(false);
  });
});

describe("buildFlushOpts (key idempotency qua retry)", () => {
  const base = { clientId: "c", enqueuedAt: 1 };
  const KEY = "11111111-2222-4333-8444-555555555555";
  it("phiên mới: dùng lại đúng key đã lưu, mọi lần gọi như nhau", () => {
    const item = { ...base, kind: "gsc", session: {}, results: [], clientRequestId: KEY } as never;
    expect(buildFlushOpts(item)).toEqual({ clientRequestId: KEY });
    expect(buildFlushOpts(item)).toEqual({ clientRequestId: KEY });
  });
  it("item cũ không có key vẫn chạy (undefined)", () => {
    const item = { ...base, kind: "vst", session: {}, observations: [] } as never;
    expect(buildFlushOpts(item)).toBeUndefined();
  });
  it("sửa phiên: không gửi key", () => {
    const item = { ...base, kind: "vst", session: {}, observations: [], existingSessionId: "s1", clientRequestId: KEY } as never;
    expect(buildFlushOpts(item)).toEqual({ existingSessionId: "s1" });
  });
});
