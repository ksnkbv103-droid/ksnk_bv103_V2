import { describe, expect, it } from "vitest";
import { isPermanentSupervisionFlushError } from "./offline-pending-supervision-save";
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
