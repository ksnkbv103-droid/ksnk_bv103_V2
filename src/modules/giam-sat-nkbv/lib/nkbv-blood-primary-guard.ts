import {
  resolveIndexEventDisposition,
  type PriorEventForDisposition,
} from "./nkbv-index-event-disposition";

/**
 * Chặn mở BSI/CLABSI nguyên phát từ mẫu máu khi máu nằm trong khung thứ phát (SBAP 17 ngày)
 * của sự kiện đủ TC trùng tác nhân, hoặc trong RIT 14 ngày của BSI trước (cùng quy tắc client).
 * Trả thông báo lỗi hoặc null nếu được phép.
 */
export function bloodPrimaryBlockedByPriorEvents(input: {
  bloodId: string;
  bloodDate: string;
  specimen: string;
  organism?: string | null;
  priorEvents: PriorEventForDisposition[];
}): string | null {
  const d = resolveIndexEventDisposition({
    indexId: input.bloodId,
    indexDate: input.bloodDate,
    specimenOrLabel: input.specimen || "Máu",
    organism: input.organism,
    priorEvents: input.priorEvents,
  });
  if (d.kind === "SECONDARY_BSI" || d.kind === "BELONGS_PRIOR_EVENT") {
    return `${d.ketLuanLabel}. ${d.reason}`;
  }
  return null;
}
