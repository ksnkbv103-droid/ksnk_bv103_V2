"use client";

/** Barrel public API — chỉ re-export symbol đang được consumer import. */
export type { CompareRow, MomentRow } from "./supervision-charts-core";
export {
  SupervisionChiSoRow,
  SupervisionTrendChart,
  SupervisionCompareAccordion,
} from "./supervision-charts-core";

export { SupervisionKhoaAnalyticsBlock } from "./supervision-charts-khoa-compare";
