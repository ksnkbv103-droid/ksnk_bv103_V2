import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";

/** Mốc CĐHA trên timeline BA (IMAGING_*), sắp theo ngày; mỗi dòng «dd/mm/yyyy — tiêu đề: ghi chú». */
export function cdhaPrintLines(milestones: readonly BaTimelineMilestone[]): string[] {
  return milestones
    .filter((m) => String(m.kind || "").toUpperCase().startsWith("IMAGING"))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((m) => {
      const [y, mo, d] = String(m.date).slice(0, 10).split("-");
      const ngay = y && mo && d ? `${d}/${mo}/${y}` : "—";
      const note = (m.detail || "").trim();
      return `${ngay} — ${m.title}${note ? `: ${note}` : ""}`;
    });
}
