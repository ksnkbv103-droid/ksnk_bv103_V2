/**
 * CLIP — Central Line Insertion Practices (NHSN Chương 5).
 * Lưu trên Device Registry metadata.clip_adherence khi device_type = CENTRAL_LINE.
 */

export type ClipAdherence = {
  hand_hygiene: boolean;
  /** Semua 5 barrier tối đa (mũ, khẩu trang, áo choàng, găng, drap). */
  maximal_barrier: boolean;
  skin_prep: "CHG" | "POVIDONE" | "ALCOHOL" | null;
  dry_before_incision: boolean;
  /** Ngày ghi nhận adherence (thường = insertion_date). */
  recorded_at?: string | null;
};

export type ClipScore = {
  adherent: boolean;
  completedCount: number;
  requiredCount: number;
  missing: string[];
  reason: string;
};

export function emptyClipAdherence(): ClipAdherence {
  return {
    hand_hygiene: false,
    maximal_barrier: false,
    skin_prep: null,
    dry_before_incision: false,
    recorded_at: null,
  };
}

export function parseClipAdherence(raw: unknown): ClipAdherence {
  const base = emptyClipAdherence();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const prep = String(o.skin_prep || "").toUpperCase();
  return {
    hand_hygiene: Boolean(o.hand_hygiene),
    maximal_barrier: Boolean(o.maximal_barrier),
    skin_prep:
      prep === "CHG" || prep === "POVIDONE" || prep === "ALCOHOL"
        ? (prep as ClipAdherence["skin_prep"])
        : null,
    dry_before_incision: Boolean(o.dry_before_incision),
    recorded_at: o.recorded_at ? String(o.recorded_at).slice(0, 10) : null,
  };
}

/** Đạt CLIP khi đủ 4 điều kiện NHSN (skin prep phải chọn). */
export function scoreClipAdherence(a: ClipAdherence): ClipScore {
  const missing: string[] = [];
  if (!a.hand_hygiene) missing.push("Vệ sinh tay");
  if (!a.maximal_barrier) missing.push("Barrier tối đa (5 món)");
  if (!a.skin_prep) missing.push("Sát khuẩn da (CHG/Povidone/Alcohol)");
  if (!a.dry_before_incision) missing.push("Để khô trước khi chọc");
  const completedCount = 4 - missing.length;
  const adherent = missing.length === 0;
  return {
    adherent,
    completedCount,
    requiredCount: 4,
    missing,
    reason: adherent
      ? "Tuân thủ đủ 4 điều kiện CLIP khi đặt CVC."
      : `Thiếu: ${missing.join("; ")}.`,
  };
}
