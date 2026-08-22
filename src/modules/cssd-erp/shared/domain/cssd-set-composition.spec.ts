import { describe, expect, it } from "vitest";
import { formatSetQtyLine, summarizeSetComposition } from "./cssd-set-composition";
import type { CompositionReconcileRow } from "../../actions/cssd-composition-reconcile.actions";

function row(partial: Partial<CompositionReconcileRow>): CompositionReconcileRow {
  return {
    chiTietId: "1",
    loaiDungCuId: "l",
    tenDungCuLe: "Kéo",
    soLuongKeHoach: 2,
    soLuongThucTe: 2,
    isMissing: false,
    missingCount: 0,
    isChiuNhiet: true,
    phanLoaiSpaulding: "CRITICAL",
    soLuongKhoDuPhong: 0,
    reserveShortage: false,
    ...partial,
  };
}

describe("summarizeSetComposition", () => {
  it("counts gap", () => {
    const s = summarizeSetComposition([
      row({ soLuongKeHoach: 2, soLuongThucTe: 1, isMissing: true, missingCount: 1 }),
      row({ chiTietId: "2", soLuongKeHoach: 10, soLuongThucTe: 10 }),
    ]);
    expect(s).toEqual({ can: 12, thuc: 11, thieu: 1, hasGap: true });
    expect(formatSetQtyLine(s.can, s.thuc, s.thieu)).toBe("11/12 món — thiếu 1");
  });
});
