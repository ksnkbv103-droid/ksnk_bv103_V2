// CSSD-038: lịch sử phiếu của mặt hàng A không được hiện (và không được in thẻ kho) dưới ngăn kéo mặt hàng B.
import { describe, expect, it } from "vitest";
import type { KhoHoaChatGiaoDichRow } from "../actions/cssd-kho-hoa-chat.actions";
import { movsForOpenDm } from "./kho-hoa-chat-movs";

const rowsA = [{ id: "p1" }, { id: "p2" }] as unknown as KhoHoaChatGiaoDichRow[];

describe("movsForOpenDm", () => {
  it("đúng mặt hàng đang mở → trả đúng danh sách phiếu", () => {
    expect(movsForOpenDm({ dmId: "A", rows: rowsA }, "A")).toBe(rowsA);
  });

  it("mở A → đóng → mở B: phiếu của A không rò sang B (chờ tải, trả null)", () => {
    expect(movsForOpenDm({ dmId: "A", rows: rowsA }, "B")).toBeNull();
  });

  it("ngăn kéo đóng hoặc chưa tải lần nào → null", () => {
    expect(movsForOpenDm({ dmId: "A", rows: rowsA }, null)).toBeNull();
    expect(movsForOpenDm(null, "A")).toBeNull();
  });

  it("mặt hàng đã tải nhưng chưa có phiếu → mảng rỗng (khác với đang tải)", () => {
    expect(movsForOpenDm({ dmId: "A", rows: [] }, "A")).toEqual([]);
  });
});
