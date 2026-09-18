/**
 * L3 Ruled-out — giải trình loại trừ (Phần V giấy).
 * Tick IP → không vào tử số NKBV. Không tự tick từ LIS/HIS.
 */

export const RULED_OUT_CLASSIFICATION = "RULED_OUT";

export type NkbvRuledOutSyndrome = "PNEU" | "UTI" | "BSI" | "VAE" | "SSI";

export type NkbvRuledOutFields = {
  ruled_out?: boolean;
  ruled_out_reasons?: string[];
  ruled_out_note?: string;
};

export type NkbvRuledOutReason = { id: string; label: string };

export const NKBV_RULED_OUT_REASONS: Record<NkbvRuledOutSyndrome, readonly NkbvRuledOutReason[]> = {
  PNEU: [
    { id: "atelectasis", label: "Xẹp phổi — không đủ imaging NHSN" },
    { id: "single_film_cpd", label: "Chỉ 1 phim khi có bệnh nền tim/phổi" },
    { id: "excluded_sputum", label: "Candida / CoNS / Enterococcus trên đờm/ETA (không đủ Table 2)" },
    { id: "gram_inadequate", label: "Nhuộm Gram / mẫu không đạt" },
    { id: "clinical_dx_only", label: "Bác sĩ ghi viêm phổi nhưng thiếu tiêu chí NHSN" },
  ],
  UTI: [
    { id: "contamination", label: "Tạp nhiễm >2 loại tác nhân — không chẩn đoán UTI" },
    { id: "candida", label: "Nấm / ký sinh trùng — CDC không dùng cho CAUTI/UTI" },
    { id: "asb_no_blood", label: "Vi khuẩn niệu không triệu chứng (ASB), không máu khớp" },
  ],
  BSI: [
    { id: "contamination_cons", label: "Ngoại nhiễm / CoNS không đủ ≥2 lần lấy riêng + triệu chứng" },
    { id: "community_fungi", label: "Nấm hô hấp cộng đồng — không phải BSI bệnh viện" },
    { id: "not_lcbi", label: "Không đạt LCBI — không tính CLABSI" },
  ],
  VAE: [
    { id: "age_lt_18", label: "Dưới 18 tuổi — không giám sát VAE người lớn" },
    { id: "vent_lt_4d", label: "Thở máy <4 ngày lịch — chưa đủ cửa VAE" },
    { id: "no_vac", label: "Không đạt VAC (PEEP/FiO₂) — không lên IVAC/PVAP" },
  ],
  SSI: [
    { id: "expired_window", label: "Hết cửa sổ theo dõi sau mổ (30/90 ngày)" },
    { id: "insufficient_criteria", label: "Thiếu tiêu chí độ sâu / triệu chứng SSI" },
    { id: "missing_event_site", label: "Thiếu loại sự kiện hoặc vị trí Organ/Space" },
  ],
};

export function normalizeRuledOutReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x || "").trim()).filter(Boolean);
}

export function hasRuledOutTicks(data: NkbvRuledOutFields | null | undefined): boolean {
  if (!data) return false;
  if (data.ruled_out === true) return true;
  return normalizeRuledOutReasons(data.ruled_out_reasons).length > 0;
}

export function inheritRuledOutFields(existing: Record<string, unknown> = {}): NkbvRuledOutFields {
  const reasons = normalizeRuledOutReasons(existing.ruled_out_reasons);
  const note = typeof existing.ruled_out_note === "string" ? existing.ruled_out_note : undefined;
  return {
    ruled_out: existing.ruled_out === true || reasons.length > 0,
    ruled_out_reasons: reasons.length ? reasons : undefined,
    ruled_out_note: note || undefined,
  };
}

export function applyRuledOutFields<T extends NkbvRuledOutFields>(
  data: T,
  input?: { reasons?: string[]; note?: string },
): T {
  const reasons = normalizeRuledOutReasons(input?.reasons);
  const note = String(input?.note || "").trim();
  if (!reasons.length && !note) return data;
  return {
    ...data,
    ruled_out: reasons.length > 0,
    ruled_out_reasons: reasons.length ? reasons : undefined,
    ruled_out_note: note || undefined,
  };
}

export function toggleRuledOutReason(current: string[] | undefined, id: string, checked: boolean): string[] {
  const set = new Set(normalizeRuledOutReasons(current));
  if (checked) set.add(id);
  else set.delete(id);
  return [...set];
}

export function ruledOutReasonLabels(
  syndrome: NkbvRuledOutSyndrome,
  reasonIds: string[] | undefined,
): string[] {
  const catalog = NKBV_RULED_OUT_REASONS[syndrome];
  const byId = new Map(catalog.map((r) => [r.id, r.label]));
  return normalizeRuledOutReasons(reasonIds).map((id) => byId.get(id) || id);
}

export function evaluateRuledOut(
  data: NkbvRuledOutFields | null | undefined,
  syndrome: NkbvRuledOutSyndrome,
): { is_positive: false; classification: typeof RULED_OUT_CLASSIFICATION; reason: string } | null {
  if (!hasRuledOutTicks(data)) return null;
  const labels = ruledOutReasonLabels(syndrome, data?.ruled_out_reasons);
  const note = String(data?.ruled_out_note || "").trim();
  const parts = [
    labels.length
      ? `Loại trừ (Ruled-out): ${labels.join("; ")}`
      : "KSNK loại trừ theo Phần V (Ruled-out) — không tính NKBV",
    note ? `Ghi chú: ${note}` : "",
  ].filter(Boolean);
  return {
    is_positive: false,
    classification: RULED_OUT_CLASSIFICATION,
    reason: `${parts.join(". ")}.`,
  };
}

/** Badge Hub: VAP (máy) vs HAP (không máy). Engine đang ghi NON_VAP; taxonomy cũng nhận HAP. */
export function pneuVentAssociationBadge(
  classification: string | null | undefined,
): "VAP" | "HAP" | null {
  const cls = String(classification || "").trim().toUpperCase();
  if (/^PNU[123]_VAP$/.test(cls)) return "VAP";
  if (/^PNU[123]_(HAP|NON_VAP)$/.test(cls)) return "HAP";
  return null;
}

export function pneuVentAssociationLabel(
  classification: string | null | undefined,
): string | null {
  const badge = pneuVentAssociationBadge(classification);
  if (badge === "VAP") return "VAP — thở máy";
  if (badge === "HAP") return "HAP — không máy";
  return null;
}
