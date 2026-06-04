import { describe, expect, it } from "vitest";
import { mergeQlcvKanbanTasks } from "./qlcv-list-merge";
import type { CongViecView } from "../types";

function row(id: string): CongViecView {
  return {
    id,
    tieu_de: id,
    loai_cong_viec: "DOT_XUAT",
    muc_do_uu_tien: "TRUNG_BINH",
    trang_thai: "DANG_LAM",
    phan_tram_hoan_thanh: 0,
    created_at: "",
    updated_at: "",
  };
}

describe("mergeQlcvKanbanTasks", () => {
  it("dedupes pending when id already in active", () => {
    const active = [row("a"), row("b")];
    const pending = [row("b"), row("c")];
    const merged = mergeQlcvKanbanTasks(active, pending);
    expect(merged.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
});
