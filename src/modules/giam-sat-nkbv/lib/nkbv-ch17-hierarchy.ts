/**
 * Ràng buộc phân cấp Chương 17 / SSI Organ-Space (NHSN).
 */

export type Ch17HierarchyContext = {
  /** Các mã site đã đạt tiêu chuẩn Ch.17 */
  metCodes: readonly string[];
  /** Đồng thời đạt PNEU (để đè LUNG) */
  pneuMet?: boolean;
  /** SSI-LUNG sau phẫu thuật lồng ngực THOR */
  ssiLungAfterThor?: boolean;
  /** Viêm trung thất sau mổ tim kèm xương ức → SSI-MED */
  postCardiacMediastinitisWithSternum?: boolean;
  procedureCode?: string | null;
  /** Ngày từ đặt shunt đến DOE; null = không phải ca shunt */
  daysSinceShunt?: number | null;
  /** MEN + IC đồng thời sau phẫu thuật → IC */
  menWithIcPostOpAbscess?: boolean;
};

export type Ch17HierarchyResult = {
  reportCode: string | null;
  asSsi: boolean;
  reason: string;
};

function upper(codes: readonly string[]): Set<string> {
  return new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean));
}

/**
 * Chọn một mã báo cáo duy nhất từ tập mã đã đạt.
 */
export function resolveCh17Hierarchy(ctx: Ch17HierarchyContext): Ch17HierarchyResult {
  const set = upper(ctx.metCodes);
  if (set.size === 0) {
    return { reportCode: null, asSsi: false, reason: "Không có mã Ch.17 đạt tiêu chuẩn." };
  }

  // Shunt MEN: ≤90 ngày → SSI-MEN; >90 → CNS-MEN (standalone)
  if (set.has("MEN") && ctx.daysSinceShunt != null && Number.isFinite(ctx.daysSinceShunt)) {
    const asSsi = ctx.daysSinceShunt <= 90;
    return {
      reportCode: "MEN",
      asSsi,
      reason: asSsi
        ? "Shunt ≤90 ngày → báo cáo SSI-MEN."
        : "Shunt >90 ngày / flushing → báo cáo CNS-MEN (không SSI).",
    };
  }

  // PNEU > LUNG trừ SSI-LUNG sau THOR
  if (set.has("LUNG") && ctx.pneuMet && !ctx.ssiLungAfterThor) {
    return {
      reportCode: "PNEU",
      asSsi: false,
      reason: "Đồng thời LUNG + PNEU → báo cáo PNEU (trừ SSI-LUNG sau THOR).",
    };
  }
  if (set.has("LUNG") && ctx.ssiLungAfterThor) {
    return {
      reportCode: "LUNG",
      asSsi: true,
      reason: "SSI-LUNG sau THOR được giữ dù có tiêu chuẩn PNEU.",
    };
  }

  // MED thay BONE khi viêm trung thất + xương ức sau mổ tim
  if (
    (set.has("MED") || set.has("BONE")) &&
    ctx.postCardiacMediastinitisWithSternum
  ) {
    return {
      reportCode: "MED",
      asSsi: true,
      reason: "Viêm trung thất sau mổ tim kèm xương ức → SSI-MED (không SSI-BONE).",
    };
  }

  // SA > MEN
  if (set.has("SA") && set.has("MEN")) {
    return { reportCode: "SA", asSsi: false, reason: "MEN + SA → báo cáo SA." };
  }

  // MEN + IC sau mổ (áp xe) → IC; MEN + IC không hậu phẫu áp xe → MEN
  if (set.has("MEN") && set.has("IC")) {
    if (ctx.menWithIcPostOpAbscess) {
      return {
        reportCode: "IC",
        asSsi: true,
        reason: "MEN + áp xe não (IC) sau phẫu thuật → báo cáo IC.",
      };
    }
    return { reportCode: "MEN", asSsi: false, reason: "MEN + IC (viêm não) → báo cáo MEN." };
  }

  // BONE > JNT
  if (set.has("BONE") && set.has("JNT")) {
    return { reportCode: "BONE", asSsi: false, reason: "JNT + BONE → báo cáo BONE." };
  }

  // BONE > PJI sau HPRO/KPRO
  const proc = String(ctx.procedureCode || "")
    .trim()
    .toUpperCase();
  if (set.has("BONE") && set.has("PJI") && (proc === "HPRO" || proc === "KPRO")) {
    return {
      reportCode: "BONE",
      asSsi: true,
      reason: "PJI + BONE sau HPRO/KPRO → báo cáo BONE.",
    };
  }

  // Ưu tiên một mã ổn định nếu nhiều mã còn lại
  const priority = [
    "ENDO",
    "MED",
    "BONE",
    "PJI",
    "SA",
    "MEN",
    "IC",
    "IAB",
    "GIT",
    "CDI",
    "GE",
    "LUNG",
    "CARD",
    "VASC",
    "DISC",
    "JNT",
  ];
  for (const p of priority) {
    if (set.has(p)) {
      return {
        reportCode: p,
        asSsi: false,
        reason: `Báo cáo ${p} (ưu tiên phân cấp mặc định).`,
      };
    }
  }

  const first = [...set][0] ?? null;
  return {
    reportCode: first,
    asSsi: false,
    reason: first ? `Báo cáo ${first}.` : "Không xác định.",
  };
}
