import { describe, expect, it } from "vitest";
import {
  ACTION_DISPLAY_LABEL,
  ACTIONS,
  MOMENT_DISPLAY_LABEL,
  MOMENT_SHORT_CODE,
  MOMENTS,
  actionDisplayLabel,
  isVstMissedAction,
  momentDisplayLabel,
  VST_MAX_MOMENTS_PER_OPP,
} from "./vst-constants";

describe("vst-constants WHO moments", () => {
  it("giữ đúng 5 chuỗi DB prod", () => {
    expect(MOMENTS).toEqual([
      "Trước khi tiếp xúc người bệnh",
      "Trước khi làm thủ thuật vô khuẩn",
      "Sau khi có nguy cơ tiếp xúc với dịch",
      "Sau khi tiếp xúc người bệnh",
      "Sau khi tiếp xúc xung quanh người bệnh",
    ]);
  });

  it("map hiển thị 1:1; TĐ3/TĐ5 theo QT.07", () => {
    expect(MOMENT_DISPLAY_LABEL[MOMENTS[2]]).toContain("phơi nhiễm với máu và dịch cơ thể");
    expect(MOMENT_DISPLAY_LABEL[MOMENTS[4]]).toContain("môi trường xung quanh người bệnh");
    expect(momentDisplayLabel(MOMENTS[0])).toBe(MOMENTS[0]);
  });

  it("mã viết tắt tách TĐ1 / TĐ4", () => {
    expect(MOMENT_SHORT_CODE[MOMENTS[0]]).toBe("T-NB");
    expect(MOMENT_SHORT_CODE[MOMENTS[3]]).toBe("S-NB");
    expect(MOMENT_SHORT_CODE[MOMENTS[0]]).not.toBe(MOMENT_SHORT_CODE[MOMENTS[3]]);
  });

  it("một cơ hội tối đa 5 thời điểm mọi hành động", () => {
    expect(VST_MAX_MOMENTS_PER_OPP).toBe(5);
    expect(isVstMissedAction("Bỏ sót")).toBe(true);
    expect(isVstMissedAction("Chà tay bằng cồn")).toBe(false);
  });

  it("nhãn hành động HW theo QT.07 — chuỗi DB không đổi", () => {
    expect(ACTIONS[0]).toBe("Rửa tay bằng nước");
    expect(ACTION_DISPLAY_LABEL["Rửa tay bằng nước"]).toBe("Rửa tay với xà phòng và nước");
    expect(actionDisplayLabel("Rửa tay bằng nước")).toContain("xà phòng");
  });
});
