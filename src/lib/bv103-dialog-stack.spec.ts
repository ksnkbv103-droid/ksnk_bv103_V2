import { describe, expect, it } from "vitest";
import { BV103_Z } from "./bv103-dialog-stack";

describe("BV103_Z — hộp thoại trên menu trái", () => {
  it("thứ tự lớp: menu < toast < hộp thoại < danh sách chọn < camera", () => {
    expect(BV103_Z.sidebar).toBeGreaterThan(BV103_Z.sidebarBackdrop);
    expect(BV103_Z.toast).toBeGreaterThan(BV103_Z.sidebar);
    expect(BV103_Z.hubOverlay).toBeGreaterThan(BV103_Z.toast);
    expect(BV103_Z.hubContent).toBeGreaterThan(BV103_Z.hubOverlay);
    expect(BV103_Z.nestedOverlay).toBeGreaterThan(BV103_Z.hubContent);
    expect(BV103_Z.nestedContent).toBeGreaterThan(BV103_Z.nestedOverlay);
    expect(BV103_Z.pickerDropdown).toBeGreaterThan(BV103_Z.nestedContent);
    expect(BV103_Z.pickerSheet).toBeGreaterThan(BV103_Z.nestedContent);
    expect(BV103_Z.popover).toBeGreaterThan(BV103_Z.pickerSheet);
    expect(BV103_Z.camera).toBeGreaterThan(BV103_Z.popover);
  });
});
