import { describe, expect, it } from "vitest";
import { assertKhoaNhanRequired, isWaitingForWardIssuance } from "./cssd-issuance-waiting";

describe("cssd-issuance-waiting", () => {
  it("treats empty khoa_nhan_id as waiting even if ma_ca_mo_id is set", () => {
    expect(isWaitingForWardIssuance({ khoa_nhan_id: null, ma_ca_mo_id: "CA-1" })).toBe(true);
  });

  it("drops the set from waiting after khoa_nhan_id is recorded", () => {
    expect(isWaitingForWardIssuance({ khoa_nhan_id: "khoa-pt", ma_ca_mo_id: null })).toBe(false);
  });

  it("requires khoa nhận on confirm", () => {
    expect(assertKhoaNhanRequired("")).toMatch(/khoa nhận/i);
    expect(assertKhoaNhanRequired("  ")).not.toBeNull();
    expect(assertKhoaNhanRequired("uuid-khoa")).toBeNull();
  });
});
