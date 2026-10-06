import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STAFF_GATE_AUTH_CHECK_AT_KEY,
  clearStaffGateAuthCheckAt,
  decideStaffGateAction,
  shouldRunGateTask,
} from "./staff-session-gate";

describe("decideStaffGateAction (chọn B cho check_failed)", () => {
  it("inactive → sign_out; check_failed → block (không signOut tự động)", () => {
    expect(decideStaffGateAction({ ok: true })).toEqual({ action: "allow" });
    expect(decideStaffGateAction({ ok: false, reason: "inactive" })).toEqual({
      action: "sign_out_inactive",
    });
    expect(decideStaffGateAction({ ok: false, reason: "check_failed" })).toEqual({
      action: "block_check_failed",
    });
    // B: không map check_failed sang sign_out
    expect(decideStaffGateAction({ ok: false, reason: "check_failed" }).action).not.toBe(
      "sign_out_inactive"
    );
  });
});

describe("clearStaffGateAuthCheckAt", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  it("check_failed path: xóa mốc để kiểm lại ngay", () => {
    shouldRunGateTask(STAFF_GATE_AUTH_CHECK_AT_KEY, 60_000);
    expect(window.sessionStorage.getItem(STAFF_GATE_AUTH_CHECK_AT_KEY)).toBeTruthy();

    clearStaffGateAuthCheckAt();
    expect(window.sessionStorage.getItem(STAFF_GATE_AUTH_CHECK_AT_KEY)).toBeNull();

    // Sau khi xóa, lần chạy kế tiếp không bị TTL chặn
    expect(shouldRunGateTask(STAFF_GATE_AUTH_CHECK_AT_KEY, 60_000)).toBe(true);
  });
});
