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
const NKBV_VAE_TIER_LABELS: Record<string, string> = {
  VAC: "VAC",
  IVAC: "IVAC",
  PVAP: "PVAP",
  NO_EVENT: "Không đạt VAE",
};

/** Tầng PNEU (HAP/VAP lâm sàng). */
const NKBV_PNEU_TIER_LABELS: Record<string, string> = {
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
  UTI_NKBV: "UTI",
  SSI: "SSI",
  LOAI_TRU: "LOAI_TRU",
};

/** Mã MDM có thể map về từng loại checklist (thứ tự ưu tiên khi tìm id). */
export const NKBV_MDM_CODE_CANDIDATES: Record<
  Exclude<NkbvChecklistTypeCode, "LOAI_TRU">,
  string[]
> = {
  BSI: ["BSI", "CLABSI", "LCBI"],
  UTI: ["UTI", "CAUTI", "UTI_NKBV"],
  SSI: ["SSI"],
  VAE: ["VAE", "VAC", "IVAC", "PVAP"],
  VAP: ["VAP", "PEDVAP"],
  HAP: ["HAP", "PNEU", "VAP", "PNU1", "PNU2", "PNU3"],
};

/** Suy loại từ bệnh phẩm / vị trí — không đọc loai_ma. */
export function inferChecklistTypeFromSpecimen(input: {
  loai_benh_pham?: string | null;
  vi_tri_nhiem_khuan?: string | null;
}): NkbvChecklistTypeCode {
  const specimenLc = String(input.loai_benh_pham || "").toLowerCase();
  const viTri = String(input.vi_tri_nhiem_khuan || "").toLowerCase();

  if (viTri.includes("vae")) return "VAE";
  if (viTri.includes("vap")) return "VAP";
  if (viTri.includes("hap") || viTri.includes("pneu")) return "HAP";
  if (viTri.includes("máu") || viTri.includes("huyết")) return "BSI";
  if (viTri.includes("tiết niệu") || (viTri.includes("niệu") && !viTri.includes("phế"))) return "UTI";
  if (viTri.includes("vết mổ") || viTri.includes("vết thương")) return "SSI";

  if (
    specimenLc.includes("nước tiểu") ||
    specimenLc.includes("urine") ||
    specimenLc.includes("niệu đạo") ||
    specimenLc.includes("catheter tiểu") ||
    (specimenLc.includes("tiểu") && !specimenLc.includes("máu"))
  ) {
    return "UTI";
  }
  if (
    specimenLc.includes("máu") ||
    specimenLc.includes("blood") ||
    specimenLc.includes("hemoculture") ||
    specimenLc.includes("cvc") ||
    specimenLc.includes("đầu catheter")
  ) {
    return "BSI";
  }
  if (
    specimenLc.includes("đờm") ||
    specimenLc.includes("sputum") ||
    specimenLc.includes("phế quản") ||
    specimenLc.includes("bal") ||
    specimenLc.includes("eta") ||
    specimenLc.includes("phổi") ||
    specimenLc.includes("dịch phế") ||
    specimenLc.includes("rút khí quản") ||
    specimenLc.includes("bronchial")
  ) {
    return "HAP";
  }
  if (
    specimenLc.includes("vết mổ") ||
    specimenLc.includes("dịch vết mổ") ||
    specimenLc.includes("surgical wound") ||
    specimenLc.includes("wound") ||
    (specimenLc.includes("mủ") &&
      (specimenLc.includes("mổ") || specimenLc.includes("vết thương") || specimenLc.includes("wound")))
  ) {
    return "SSI";
  }

  return "BSI";
}

/**
 * Tìm id danh mục MDM theo loại checklist (alias BSI↔CLABSI, UTI↔CAUTI…).
 * Không fallback sang phần tử đầu (tránh luôn SSI).
 */
export function resolveMdmLoaiId(
  checklistType: Exclude<NkbvChecklistTypeCode, "LOAI_TRU">,
  categories: Array<{ id: string; ma_loai?: string | null }> | null | undefined,
  khacFallback = true,
): string | null {
  if (!categories?.length) return null;
  const candidates = NKBV_MDM_CODE_CANDIDATES[checklistType] || [];
  for (const code of candidates) {
    const hit = categories.find((c) => String(c.ma_loai || "").toUpperCase() === code);
    if (hit?.id) return hit.id;
  }
  if (khacFallback) {
    const khac = categories.find((c) => String(c.ma_loai || "").toUpperCase() === "KHAC");
    if (khac?.id) return khac.id;
  }
  return null;
}

/**
 * Gợi ý loại sự kiện nhiễm khuẩn theo bệnh phẩm / vị trí LIS.
 * Ưu tiên bệnh phẩm; chỉ dùng loai_ma khi khớp và không mâu thuẫn bệnh phẩm.
 */
export function suggestNkbvTypeFromSpecimen(input: {
  loai_benh_pham?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  loai_ma?: string | null;
}): { type: NkbvChecklistTypeCode; reason: string } {
  const specimen = String(input.loai_benh_pham || "").trim();
  const fromSpecimen = inferChecklistTypeFromSpecimen(input);
  const fromMa = normalizeNkbvLoaiCode(input.loai_ma);

  const specimenSignal = Boolean(
    String(input.loai_benh_pham || "").trim() || String(input.vi_tri_nhiem_khuan || "").trim(),
  );

  if (specimenSignal) {
    if (fromMa && fromMa !== "LOAI_TRU" && fromMa !== fromSpecimen) {
      return {
        type: fromSpecimen,
        reason: specimen
          ? `Bệnh phẩm «${specimen}» → gợi ý ${NKBV_CHECKLIST_TYPE_LABELS[fromSpecimen]} (bỏ qua mã phiếu ${String(input.loai_ma)} vì không khớp bệnh phẩm).`
          : `Theo vị trí/bệnh phẩm → ${NKBV_CHECKLIST_TYPE_LABELS[fromSpecimen]} (bỏ qua mã phiếu không khớp).`,
      };
    }
    const hint =
      fromSpecimen === "HAP"
        ? " Có thể đổi sang VAE/VAP nếu bệnh nhân thở máy."
        : fromSpecimen === "BSI"
          ? " Nhiễm khuẩn máu thứ phát xem hàng SBAP nếu đã có ổ nguyên phát."
          : "";
    return {
      type: fromSpecimen,
      reason: specimen
        ? `Bệnh phẩm «${specimen}» → gợi ý ${NKBV_CHECKLIST_TYPE_LABELS[fromSpecimen]}.${hint}`
        : `Theo vị trí trên phiếu → gợi ý ${NKBV_CHECKLIST_TYPE_LABELS[fromSpecimen]}.${hint}`,
    };
  }

  if (fromMa && fromMa !== "LOAI_TRU") {
    return {
      type: fromMa,
      reason: `Theo mã loại đã gắn trên phiếu (${String(input.loai_ma)}).`,
    };
  }

  return {
    type: "BSI",
    reason: "Chưa có bệnh phẩm — mặc định gợi ý BSI; hãy chọn đúng loại bên dưới.",
  };
}

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
