/**
 * Nhãn hiển thị loại NKBV — từng hội chứng hô hấp **tách riêng** theo domain CDC:
 * - VAE: người lớn thở máy (tầng VAC → IVAC → PVAP), không dùng X-quang
 * - VAP: viêm phổi liên quan thở máy theo tiêu chuẩn PNEU (PedVAP / giám sát VAP)
 * - HAP: viêm phổi bệnh viện không do thở máy (PNEU non-vent)
 * Không gộp VAE với VAP/HAP.
 */

export type NkbvChecklistTypeCode =
  | "BSI"
  | "UTI"
  | "SSI"
  | "VAE"
  | "VAP"
  | "HAP"
  | "LOAI_TRU";

/** Nhãn ngắn (chip, cột danh sách, thống kê). */
export const NKBV_CHECKLIST_TYPE_LABELS: Record<NkbvChecklistTypeCode, string> = {
  BSI: "Huyết (BSI/CLABSI)",
  UTI: "Tiết niệu (UTI)",
  SSI: "Vết mổ (SSI)",
  VAE: "VAE — biến cố thở máy (VAC/IVAC/PVAP)",
  VAP: "VAP — viêm phổi liên quan thở máy",
  HAP: "HAP — viêm phổi bệnh viện (không thở máy)",
  LOAI_TRU: "Loại trừ / Không",
};

/** Nhãn nút phán quyết mẫu. */
export const NKBV_CHECKLIST_TYPE_PICKER_LABELS: Record<NkbvChecklistTypeCode, string> = {
  BSI: "💉 Huyết (BSI/CLABSI)",
  UTI: "🚰 Tiết niệu (UTI)",
  SSI: "✂️ Vết mổ (SSI)",
  VAE: "🫁 VAE (VAC→IVAC→PVAP)",
  VAP: "🫁 VAP / PedVAP",
  HAP: "🏥 HAP (PNEU không thở máy)",
  LOAI_TRU: "🚫 Loại trừ / Không",
};

/** Tầng phân loại trong một ca VAE (không phải loại ca MDM). */
export const NKBV_VAE_TIER_LABELS: Record<string, string> = {
  VAC: "VAC",
  IVAC: "IVAC",
  PVAP: "PVAP",
  NO_EVENT: "Không đạt VAE",
};

/** Tầng PNEU (HAP/VAP lâm sàng). */
export const NKBV_PNEU_TIER_LABELS: Record<string, string> = {
  PNU1: "PNU1 — lâm sàng",
  PNU2: "PNU2 — vi sinh",
  PNU3: "PNU3 — suy giảm miễn dịch",
  NO_EVENT: "Không đạt PNEU",
};

const CODE_ALIASES: Record<string, NkbvChecklistTypeCode> = {
  VAE: "VAE",
  VAC: "VAE",
  IVAC: "VAE",
  PVAP: "VAE",
  VAP: "VAP",
  PEDVAP: "VAP",
  HAP: "HAP",
  PNEU: "HAP",
  PNU1: "HAP",
  PNU2: "HAP",
  PNU3: "HAP",
  BSI: "BSI",
  CLABSI: "BSI",
  LCBI: "BSI",
  UTI: "UTI",
  CAUTI: "UTI",
  SSI: "SSI",
  LOAI_TRU: "LOAI_TRU",
};

/** Chuẩn hóa mã MDM / gợi ý → mã checklist (không gộp VAE↔VAP↔HAP). */
export function normalizeNkbvLoaiCode(ma: string | null | undefined): NkbvChecklistTypeCode | null {
  const raw = String(ma || "").trim().toUpperCase();
  if (!raw) return null;
  if (CODE_ALIASES[raw]) return CODE_ALIASES[raw];
  for (const [key, code] of Object.entries(CODE_ALIASES)) {
    if (raw.includes(key)) return code;
  }
  return null;
}

/** Hiển thị cột danh sách / dropdown: giữ đúng loại, không gộp hô hấp. */
export function formatNkbvLoaiDisplay(
  ma: string | null | undefined,
  ten: string | null | undefined,
): string {
  const code = normalizeNkbvLoaiCode(ma);
  if (code && code !== "LOAI_TRU") {
    // Ưu tiên nhãn chuẩn cho VAE/VAP/HAP để không lẫn
    if (code === "VAE" || code === "VAP" || code === "HAP") {
      return NKBV_CHECKLIST_TYPE_LABELS[code];
    }
  }
  const t = String(ten || "").trim();
  if (t) return t;
  if (code) return NKBV_CHECKLIST_TYPE_LABELS[code];
  const m = String(ma || "").trim();
  return m || "—";
}

export function formatNkbvChecklistTypeLabel(code: string | null | undefined): string {
  const n = normalizeNkbvLoaiCode(code) ?? (String(code || "").trim().toUpperCase() as NkbvChecklistTypeCode);
  if (n in NKBV_CHECKLIST_TYPE_LABELS) {
    return NKBV_CHECKLIST_TYPE_LABELS[n as NkbvChecklistTypeCode];
  }
  return String(code || "").trim() || "—";
}

/** Form lâm sàng theo loại đã chọn (tách pathway). */
export function nkbvClinicalFormPathway(
  code: NkbvChecklistTypeCode | string,
): "VAE" | "PNEU" | "BSI" | "UTI" | "SSI" | null {
  const n = normalizeNkbvLoaiCode(code) ?? (code as NkbvChecklistTypeCode);
  if (n === "VAE") return "VAE";
  if (n === "VAP" || n === "HAP") return "PNEU";
  if (n === "BSI" || n === "UTI" || n === "SSI") return n;
  return null;
}

/** Mã persist MDM cho loại đã chọn. */
export function nkbvPersistLoaiCode(checklistType: string): string {
  const n = normalizeNkbvLoaiCode(checklistType);
  if (n === "VAE") return "VAE";
  if (n === "VAP") return "VAP";
  if (n === "HAP") return "HAP";
  if (n === "BSI") return "BSI";
  if (n === "UTI") return "UTI";
  if (n === "SSI") return "SSI";
  return String(checklistType || "").trim().toUpperCase();
}
