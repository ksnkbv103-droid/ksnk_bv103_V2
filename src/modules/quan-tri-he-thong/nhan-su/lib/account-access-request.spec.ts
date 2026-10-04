import { describe, expect, it } from "vitest";
import { formatAccountRequestTicketCode, PENDING_ACCOUNT_REQUEST_CONTAINS } from "./account-access-request";

describe("formatAccountRequestTicketCode", () => {
  it("rút UUID thành mã YC-8 ký tự", () => {
    expect(formatAccountRequestTicketCode("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("YC-A1B2C3D4");
  });

  it("bỏ qua id quá ngắn", () => {
    expect(formatAccountRequestTicketCode("abc")).toBeNull();
    expect(formatAccountRequestTicketCode(null)).toBeNull();
  });
});

describe("PENDING_ACCOUNT_REQUEST_CONTAINS", () => {
  it("lọc extra_data hồ sơ status CHO_DUYET", () => {
    expect(PENDING_ACCOUNT_REQUEST_CONTAINS).toEqual({
      account_request: { status: "CHO_DUYET" },
    });
  });
});
