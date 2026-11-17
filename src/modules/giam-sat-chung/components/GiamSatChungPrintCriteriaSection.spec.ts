import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import { GiamSatChungPrintCriteriaSection } from "./GiamSatChungPrintCriteriaSection";

// VST-018 (PO 2026-11-17, phiếu V5): bản in đánh dấu ● ở ô kết quả đã chọn;
// không khối IV, không dòng kết luận đạt/không đạt.
const template: ChecklistTemplate = {
  id: "t1",
  title: "Bảng kiểm thử",
  cach_tinh_diem: "TY_LE",
  criteria: [
    { id: "c1", label: "Tiêu chí đạt" },
    { id: "c2", label: "Tiêu chí không đạt" },
    { id: "c3", label: "Tiêu chí không áp dụng" },
    { id: "c4", label: "Tiêu chí chưa chấm" },
  ],
};
const results: ChecklistResult[] = [
  { criterionId: "c1", value: "DAT" },
  { criterionId: "c2", value: "KHONG_DAT" },
  { criterionId: "c3", value: "NA" },
];

/** Mỗi hàng tbody → nội dung chữ của 3 ô kết quả (Đạt, K.Đạt, KAD). */
function resultCellsByRow(html: string): string[][] {
  const body = html.split("<tbody>")[1]?.split("</tbody>")[0] ?? "";
  return body
    .split("<tr")
    .slice(1)
    .map((tr) => {
      const cells = [...tr.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").trim(),
      );
      return cells.slice(2, 5);
    });
}

function render(): string {
  return renderToStaticMarkup(
    React.createElement(GiamSatChungPrintCriteriaSection, { template, results, session: {} }),
  );
}

describe("GiamSatChungPrintCriteriaSection (VST-018)", () => {
  it("in ● đúng ô đã chọn, hàng chưa chấm không có dấu", () => {
    expect(resultCellsByRow(render())).toEqual([
      ["●", "", ""],
      ["", "●", ""],
      ["", "", "●"],
      ["", "", ""],
    ]);
  });

  it("không thêm khối IV hay dòng kết luận đạt/không đạt (PO V5)", () => {
    const html = render();
    expect(html).not.toMatch(/khắc phục|kết luận|đạt yêu cầu/i);
  });
});
