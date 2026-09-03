import type { CompositionReconcileRow } from "../../actions/cssd-composition-reconcile.actions";

export function summarizeSetComposition(items: CompositionReconcileRow[]) {
  let can = 0;
  let thuc = 0;
  let thieu = 0;
  for (const row of items) {
    can += row.soLuongKeHoach;
    thuc += row.soLuongThucTe;
    thieu += Math.max(0, row.soLuongKeHoach - row.soLuongThucTe);
  }
  return { can, thuc, thieu, hasGap: thieu > 0 };
}

export function formatSetQtyLine(can: number, thuc: number, thieu: number): string {
  if (thieu > 0) return `${thuc}/${can} món — thiếu ${thieu}`;
  return `${thuc}/${can} món`;
}
