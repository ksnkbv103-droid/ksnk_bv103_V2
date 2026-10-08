import { describe, expect, it } from "vitest";
import {
  ACTION_DISPLAY_LABEL,
  ACTION_UI_LABEL,
  ACTIONS,
  MOMENT_DISPLAY_LABEL,
  MOMENT_SHORT_CODE,
  MOMENT_UI_LABEL,
  MOMENTS,
  actionDisplayLabel,
  actionUiLabel,
  clampMomentsForAction,
  isVstMissedAction,
  maxMomentsForAction,
  momentDisplayLabel,
  momentUiLabel,
  VST_MAX_MOMENTS_COMPLIANT,
  VST_MAX_MOMENTS_MISSED,
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

  it("mã / nhãn UI tách TĐ1 / TĐ4 bằng TRƯỚC·SAU", () => {
    expect(MOMENT_SHORT_CODE[MOMENTS[0]]).toBe("TXNB");
    expect(MOMENT_SHORT_CODE[MOMENTS[1]]).toBe("TTVK");
    expect(MOMENT_SHORT_CODE[MOMENTS[2]]).toBe("TXDCT");
    expect(MOMENT_SHORT_CODE[MOMENTS[3]]).toBe("TXNB");
    expect(MOMENT_SHORT_CODE[MOMENTS[4]]).toBe("TXXQNB");
    expect(MOMENT_UI_LABEL[MOMENTS[0]]).toBe("TRƯỚC TXNB");
    expect(MOMENT_UI_LABEL[MOMENTS[1]]).toBe("TRƯỚC TTVK");
    expect(MOMENT_UI_LABEL[MOMENTS[2]]).toBe("SAU TXDCT");
    expect(MOMENT_UI_LABEL[MOMENTS[3]]).toBe("SAU TXNB");
    expect(MOMENT_UI_LABEL[MOMENTS[4]]).toBe("SAU TXXQNB");
    expect(momentUiLabel(MOMENTS[0])).not.toBe(momentUiLabel(MOMENTS[3]));
  });

  it("domain §2.1: tuân thủ ≤2 chỉ định; bỏ sót ≤1", () => {
    expect(VST_MAX_MOMENTS_COMPLIANT).toBe(2);
    expect(VST_MAX_MOMENTS_MISSED).toBe(1);
    expect(VST_MAX_MOMENTS_PER_OPP).toBe(2);
    expect(maxMomentsForAction("Rửa tay bằng nước")).toBe(2);
    expect(maxMomentsForAction("Chà tay bằng cồn")).toBe(2);
    expect(maxMomentsForAction(null)).toBe(2);
    expect(maxMomentsForAction("Bỏ sót")).toBe(1);
    expect(clampMomentsForAction(["a", "b", "c"], "Rửa tay bằng nước")).toEqual(["a", "b"]);
    expect(clampMomentsForAction(["a", "b"], "Bỏ sót")).toEqual(["a"]);
    expect(isVstMissedAction("Bỏ sót")).toBe(true);
    expect(isVstMissedAction("Chà tay bằng cồn")).toBe(false);
  });

  it("nhãn hành động HW theo QT.07 — chuỗi DB không đổi", () => {
    expect(ACTIONS[0]).toBe("Rửa tay bằng nước");
    expect(ACTION_DISPLAY_LABEL["Rửa tay bằng nước"]).toBe("Rửa tay với xà phòng và nước");
    expect(actionDisplayLabel("Rửa tay bằng nước")).toContain("xà phòng");
    expect(ACTION_UI_LABEL["Rửa tay bằng nước"]).toBe("RỬA TAY");
    expect(ACTION_UI_LABEL["Chà tay bằng cồn"]).toBe("CHÀ CỒN");
    expect(ACTION_UI_LABEL["Bỏ sót"]).toBe("BỎ SÓT");
    expect(actionUiLabel("Bỏ sót")).toBe("BỎ SÓT");
  });
});
