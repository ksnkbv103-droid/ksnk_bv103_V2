import { describe, expect, it } from "vitest";
import { CSSD_ACTIVE_PAGE_SIZE, nextActivePageFrom } from "./cssd-active-page";

describe("cssd active page", () => {
  it("keeps paging when a page is full (không cắt 1000)", () => {
    expect(nextActivePageFrom(CSSD_ACTIVE_PAGE_SIZE, 0)).toBe(1000);
    expect(nextActivePageFrom(CSSD_ACTIVE_PAGE_SIZE, 1000)).toBe(2000);
  });

  it("stops when the page is short — inactive/thu hồi đã lọc ở query", () => {
    expect(nextActivePageFrom(120, 0)).toBeNull();
    expect(nextActivePageFrom(0, 0)).toBeNull();
  });
});
