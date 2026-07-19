// src/lib/domain/cssd-packaging-rules.ts

export type BomItem = {
  loai_id: string;
  ten: string;
  so_luong_ke_hoach: number;
  so_luong_thuc_te: number;
  so_luong_hong?: number;
  is_chiu_nhiet: boolean;
  phan_loai_spaulding: "CRITICAL" | "SEMI_CRITICAL" | "NON_CRITICAL";
  phuong_phap_tiet_khuan_chi_dinh: "STEAM_134" | "STEAM_121" | "PLASMA" | "EO";
};

export type SterilizationMethod = BomItem["phuong_phap_tiet_khuan_chi_dinh"];
export type SpauldingClass = BomItem["phan_loai_spaulding"];

export type HeatEvaluation = {
  requireSplit: boolean;
  recommendedMethod: SterilizationMethod;
  reason: string;
  /** Mức Spaulding cao nhất trong bộ (CRITICAL > SEMI > NON). */
  spauldingMax: SpauldingClass;
  methodLabelVi: string;
};

export type GapRow = {
  loai_id: string;
  ten: string;
  thieu: number;
  hong: number;
};

const SPAULDING_RANK: Record<SpauldingClass, number> = {
  NON_CRITICAL: 0,
  SEMI_CRITICAL: 1,
  CRITICAL: 2,
};

export const STERILIZATION_METHOD_LABEL_VI: Record<SterilizationMethod, string> = {
  STEAM_134: "Hấp hơi nước 134°C",
  STEAM_121: "Hấp hơi nước 121°C",
  PLASMA: "Plasma (nhiệt thấp)",
  EO: "Ethylene oxide (EO)",
};

export const SPAULDING_LABEL_VI: Record<SpauldingClass, string> = {
  CRITICAL: "Cực kỳ nguy hiểm (Critical)",
  SEMI_CRITICAL: "Nguy hiểm (Semi-critical)",
  NON_CRITICAL: "Không nguy hiểm (Non-critical)",
};

export function resolveHighestSpaulding(items: BomItem[]): SpauldingClass {
  let max: SpauldingClass = "NON_CRITICAL";
  for (const item of items) {
    if (SPAULDING_RANK[item.phan_loai_spaulding] > SPAULDING_RANK[max]) {
      max = item.phan_loai_spaulding;
    }
  }
  return max;
}

function pickStrictestLowTempMethod(methods: SterilizationMethod[]): SterilizationMethod {
  if (methods.includes("EO")) return "EO";
  if (methods.includes("PLASMA")) return "PLASMA";
  if (methods.includes("STEAM_121")) return "STEAM_121";
  return "STEAM_134";
}

/**
 * Đánh giá Spaulding + chịu nhiệt → đề xuất phương pháp TK (Poka-yoke).
 * Không đổi FSM trạm — chỉ gợi ý / cờ tách bộ.
 */
export function evaluateHeatCompatibility(items: BomItem[]): HeatEvaluation {
  if (!items || items.length === 0) {
    return {
      requireSplit: false,
      recommendedMethod: "STEAM_134",
      reason: "Không có dụng cụ trong bộ.",
      spauldingMax: "NON_CRITICAL",
      methodLabelVi: STERILIZATION_METHOD_LABEL_VI.STEAM_134,
    };
  }

  const spauldingMax = resolveHighestSpaulding(items);
  const lowTempItems = items.filter((item) => !item.is_chiu_nhiet);

  if (lowTempItems.length > 0) {
    const methods = lowTempItems.map((item) => item.phuong_phap_tiet_khuan_chi_dinh);
    const recommendedMethod = pickStrictestLowTempMethod(methods);

    return {
      requireSplit: true,
      recommendedMethod,
      spauldingMax,
      methodLabelVi: STERILIZATION_METHOD_LABEL_VI[recommendedMethod],
      reason: `Bộ dụng cụ hỗn hợp chứa cấu phần nhạy cảm nhiệt (${lowTempItems.map((i) => i.ten).join(", ")}). Spaulding cao nhất: ${SPAULDING_LABEL_VI[spauldingMax]}. Đề xuất ${STERILIZATION_METHOD_LABEL_VI[recommendedMethod]}, hoặc tách túi hấp riêng.`,
    };
  }

  // Đồng nhất chịu nhiệt — CRITICAL ưu tiên STEAM_134 trừ khi toàn bộ chỉ định 121
  const designated = items.map((i) => i.phuong_phap_tiet_khuan_chi_dinh);
  let recommendedMethod: SterilizationMethod = "STEAM_134";
  if (spauldingMax === "CRITICAL") {
    recommendedMethod = designated.every((m) => m === "STEAM_121") ? "STEAM_121" : "STEAM_134";
  } else if (designated.length > 0) {
    recommendedMethod = pickStrictestLowTempMethod(designated);
  }

  return {
    requireSplit: false,
    recommendedMethod,
    spauldingMax,
    methodLabelVi: STERILIZATION_METHOD_LABEL_VI[recommendedMethod],
    reason: `Đồng nhất nhiệt lý tính. Spaulding cao nhất: ${SPAULDING_LABEL_VI[spauldingMax]}. Khuyến nghị ${STERILIZATION_METHOD_LABEL_VI[recommendedMethod]}.`,
  };
}

/**
 * Tổng hợp độ lệch của số lượng thực tế so với thiết kế chuẩn (BOM).
 */
export function summarizeBomGap(items: BomItem[]): GapRow[] {
  if (!items) return [];

  const gaps: GapRow[] = [];

  for (const item of items) {
    const thieu = Math.max(0, item.so_luong_ke_hoach - item.so_luong_thuc_te);
    const hong = item.so_luong_hong ?? 0;

    if (thieu > 0 || hong > 0) {
      gaps.push({
        loai_id: item.loai_id,
        ten: item.ten,
        thieu,
        hong,
      });
    }
  }

  return gaps;
}

/**
 * Kiểm tra xem bộ dụng cụ đã đủ điều kiện để Đóng gói đạt hay chưa.
 * Theo quy tắc an toàn vật lý lý tính, nếu lẫn nhiệt bắt buộc phải tách SUB trước.
 * Thiếu hụt số lượng không chặn đóng gói (chỉ cảnh báo).
 */
export function isReadyForPackaging(
  items: BomItem[],
  split: "NONE" | "DONE",
): { ready: boolean; reason?: string } {
  const heatEval = evaluateHeatCompatibility(items);

  if (heatEval.requireSplit && split === "NONE") {
    return {
      ready: false,
      reason: "Cần tách cấu phần nhạy cảm nhiệt sang túi hấp nhiệt độ thấp trước khi Đạt.",
    };
  }

  return {
    ready: true,
  };
}
