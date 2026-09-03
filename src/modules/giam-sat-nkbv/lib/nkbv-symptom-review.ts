/**
 * KSNK ghi nhận trên phiếu: xác nhận + ghi chú từng triệu chứng.
 * Mốc ngày vẫn là sự thật lâm sàng (đồng bộ lưới BA).
 */

export const NKBV_SYMPTOM_CONFIRM = ["chua", "dung", "sai"] as const;
export type NkbvSymptomConfirm = (typeof NKBV_SYMPTOM_CONFIRM)[number];

export type NkbvSymptomReviewEntry = {
  confirmed: NkbvSymptomConfirm;
  note: string;
};

export type NkbvSymptomReviewMap = Record<string, NkbvSymptomReviewEntry>;

export function emptySymptomReview(): NkbvSymptomReviewEntry {
  return { confirmed: "chua", note: "" };
}

export function parseSymptomReviewMap(raw: unknown): NkbvSymptomReviewMap {
  if (!raw || typeof raw !== "object") return {};
  const out: NkbvSymptomReviewMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key) continue;
    if (!val || typeof val !== "object") continue;
    const rec = val as { confirmed?: unknown; note?: unknown };
    const c = String(rec.confirmed || "chua");
    out[key] = {
      confirmed: c === "dung" || c === "sai" ? c : "chua",
      note: String(rec.note || ""),
    };
  }
  return out;
}

export function patchSymptomReview(
  map: NkbvSymptomReviewMap,
  key: string,
  patch: Partial<NkbvSymptomReviewEntry>,
): NkbvSymptomReviewMap {
  const cur = map[key] || emptySymptomReview();
  return {
    ...map,
    [key]: {
      confirmed: patch.confirmed ?? cur.confirmed,
      note: patch.note !== undefined ? patch.note : cur.note,
    },
  };
}

/** Ngày mốc trên phiếu → cờ form (thuật toán đọc boolean). Khóa rỗng → false. */
export function booleanFieldsFromSymptomDates(
  dates: Record<string, string>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, d] of Object.entries(dates)) {
    out[k] = Boolean(String(d || "").slice(0, 10));
  }
  return out;
}

/** Gắn cờ triệu chứng vào form đang mở — cùng nguồn ngày với lưới BA. */
export function mergeFormSymptomBooleans<T>(
  form: T | null,
  dates: Record<string, string>,
): T | null {
  if (!form || typeof form !== "object") return form;
  const flags = booleanFieldsFromSymptomDates(dates);
  if (!Object.keys(flags).length) return form;
  return { ...form, ...flags };
}
