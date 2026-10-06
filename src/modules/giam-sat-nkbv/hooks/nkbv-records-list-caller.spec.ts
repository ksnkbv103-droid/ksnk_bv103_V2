import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedLatestCaller } from "./nkbv-records-list-caller";

describe("createDebouncedLatestCaller (tab HSBA NKBV)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gõ nhanh trong <300 ms → chỉ 1 lần gọi với giá trị cuối", async () => {
    const listFn = vi.fn(async (p: { search: string }) => ({ search: p.search }));
    const caller = createDebouncedLatestCaller(listFn, { debounceMs: 300 });
    const applied: string[] = [];

    caller.schedule({ search: "a" }, (r) => applied.push(r.search));
    caller.schedule({ search: "ab" }, (r) => applied.push(r.search));
    caller.schedule({ search: "abc" }, (r) => applied.push(r.search));

    expect(listFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(299);
    expect(listFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(listFn).toHaveBeenCalledTimes(1);
    expect(listFn).toHaveBeenCalledWith({ search: "abc" });
    expect(applied).toEqual(["abc"]);
    caller.dispose();
  });

  it("phản hồi chậm của truy vấn cũ không đè dữ liệu truy vấn mới", async () => {
    type Res = { search: string };
    const resolvers: Array<(v: Res) => void> = [];
    const listFn = vi.fn(
      (p: { search: string }) =>
        new Promise<Res>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const caller = createDebouncedLatestCaller(listFn, { debounceMs: 300 });
    let applied: string | null = null;

    caller.schedule({ search: "old" }, (r) => {
      applied = r.search;
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(listFn).toHaveBeenCalledTimes(1);

    caller.schedule({ search: "new" }, (r) => {
      applied = r.search;
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(listFn).toHaveBeenCalledTimes(2);

    // Truy vấn cũ resolve sau → bỏ qua
    resolvers[0]!({ search: "old" });
    await Promise.resolve();
    expect(applied).toBeNull();

    resolvers[1]!({ search: "new" });
    await Promise.resolve();
    expect(applied).toBe("new");
    caller.dispose();
  });
});
