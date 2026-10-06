import { describe, expect, it } from "vitest";
import { createLoadRequestGuard } from "./bao-cao-tong-hop-load-guard";

describe("createLoadRequestGuard", () => {
  it("phản hồi lần 1 về sau lần 2 → chỉ lần 2 được apply", async () => {
    const guard = createLoadRequestGuard();
    let payload: string | null = null;

    const id1 = guard.begin();
    const id2 = guard.begin();

    const p1 = Promise.resolve("old").then((v) => {
      if (guard.isCurrent(id1)) payload = v;
    });
    const p2 = Promise.resolve("new").then((v) => {
      if (guard.isCurrent(id2)) payload = v;
    });

    await p2;
    await p1;

    expect(payload).toBe("new");
    expect(guard.isCurrent(id1)).toBe(false);
    expect(guard.isCurrent(id2)).toBe(true);
  });
});
