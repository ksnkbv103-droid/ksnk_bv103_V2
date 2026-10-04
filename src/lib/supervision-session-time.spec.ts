import { describe, expect, it } from "vitest";
import {
  isReplayCameraSupervisionCachThuc,
  REPLAY_CAMERA_CACH_THUC_MA,
} from "./supervision-session-time";

describe("isReplayCameraSupervisionCachThuc (GS-06)", () => {
  it("nhận diện theo mã CT_CAMERA_LAI dù đổi nhãn", () => {
    expect(isReplayCameraSupervisionCachThuc(REPLAY_CAMERA_CACH_THUC_MA)).toBe(true);
    expect(isReplayCameraSupervisionCachThuc("ct_camera_lai")).toBe(true);
  });

  it("fallback nhãn legacy", () => {
    expect(isReplayCameraSupervisionCachThuc("Giám sát lại qua camera")).toBe(true);
    expect(isReplayCameraSupervisionCachThuc("Giám sát trực tiếp tại chỗ")).toBe(false);
  });
});
