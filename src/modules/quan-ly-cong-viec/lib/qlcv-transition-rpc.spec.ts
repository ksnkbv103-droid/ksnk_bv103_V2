import { describe, expect, it } from "vitest";
import { invokeQlcvTransition, isQlcvTransitionStaleError } from "./qlcv-transition-rpc";

const fakeClient = (message: string) =>
  ({ rpc: async () => ({ data: null, error: { message } }) }) as never;

describe("invokeQlcvTransition xung đột", () => {
  it("báo xung đột rõ và vẫn nhận diện là stale", async () => {
    const err = await invokeQlcvTransition(
      fakeClient("Trạng thái công việc đã thay đổi hoặc không cập nhật được"),
      { congViecId: "a", action: "NGHIEM_THU", actorNhanSuId: null },
    ).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/tải lại/);
    expect(isQlcvTransitionStaleError((err as Error).message)).toBe(true);
  });
  it("lỗi khác giữ nguyên", async () => {
    await expect(
      invokeQlcvTransition(fakeClient("Không tìm thấy công việc"), { congViecId: "a", action: "HUY", actorNhanSuId: null }),
    ).rejects.toThrow("Không tìm thấy công việc");
  });
});
