import { describe, expect, it } from "vitest";
import { filterOutRecallPending } from "./cssd-cap-phat-waiting";

describe("filterOutRecallPending", () => {
  it("bỏ bộ CHO_THU_VE, giữ bộ còn lại", () => {
    const rows = [{ id: "a" }, { id: 2 }, { id: "c" }];
    expect(filterOutRecallPending(rows, new Set(["2"]))).toEqual([{ id: "a" }, { id: "c" }]);
  });
});
