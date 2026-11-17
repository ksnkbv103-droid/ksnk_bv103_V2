import { describe, expect, it } from "vitest";
import { createExclusiveRunner } from "./cssd-run-exclusive";

// CSSD-029: bấm đúp «Ghi nhận» không được lập hai phiếu kho hóa chất.
describe("createExclusiveRunner", () => {
  it("lần gọi thứ hai khi lần đầu chưa xong bị bỏ qua, hàm chỉ chạy một lần", async () => {
    const runner = createExclusiveRunner();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((res) => {
      release = res;
    });
    const first = runner.run(async () => {
      calls += 1;
      await gate;
      return "a";
    });
    const second = await runner.run(async () => {
      calls += 1;
      return "b";
    });
    expect(second).toEqual({ ran: false });
    expect(runner.isRunning()).toBe(true);
    release();
    expect(await first).toEqual({ ran: true, value: "a" });
    expect(calls).toBe(1);
  });

  it("chạy lại được sau khi lần trước xong", async () => {
    const runner = createExclusiveRunner();
    await runner.run(async () => 1);
    expect(runner.isRunning()).toBe(false);
    expect(await runner.run(async () => 2)).toEqual({ ran: true, value: 2 });
  });

  it("hàm ném lỗi thì vẫn mở khóa để thử lại", async () => {
    const runner = createExclusiveRunner();
    await expect(
      runner.run(async () => {
        throw new Error("mất mạng");
      }),
    ).rejects.toThrow("mất mạng");
    expect(runner.isRunning()).toBe(false);
    expect(await runner.run(async () => "ok")).toEqual({ ran: true, value: "ok" });
  });
});
