/**
 * CSSD heat-split Lock A: bộ hỗn hợp → 2 thành phần (chịu nhiệt / không chịu nhiệt)
 * gắn parent_bo_id. Pure — không I/O.
 */

export type HeatSplitBomLine = {
  chiTietId: string;
  loaiId: string;
  isChiuNhiet: boolean;
  ten: string;
  soLuong: number;
};

export type HeatSplitPlan = {
  needsSplit: boolean;
  mainChiTietIds: string[];
  subChiTietIds: string[];
  reason: string;
};

/** Chỉ tách khi bộ có CẢ dòng chịu nhiệt VÀ dòng không chịu nhiệt. */
export function planHeatSplitForBo(lines: HeatSplitBomLine[]): HeatSplitPlan {
  const active = (lines || []).filter((l) => String(l.chiTietId || "").trim());
  if (active.length === 0) {
    return {
      needsSplit: false,
      mainChiTietIds: [],
      subChiTietIds: [],
      reason: "Bộ không có dòng cấu phần.",
    };
  }
  const heat = active.filter((l) => l.isChiuNhiet);
  const cold = active.filter((l) => !l.isChiuNhiet);
  if (heat.length === 0) {
    return {
      needsSplit: false,
      mainChiTietIds: [],
      subChiTietIds: cold.map((l) => l.chiTietId),
      reason: "Toàn bộ không chịu nhiệt — không cần tách thành phần.",
    };
  }
  if (cold.length === 0) {
    return {
      needsSplit: false,
      mainChiTietIds: heat.map((l) => l.chiTietId),
      subChiTietIds: [],
      reason: "Toàn bộ chịu nhiệt — không cần tách.",
    };
  }
  return {
    needsSplit: true,
    mainChiTietIds: heat.map((l) => l.chiTietId),
    subChiTietIds: cold.map((l) => l.chiTietId),
    reason: `Hỗn hợp: ${heat.length} dòng chịu nhiệt · ${cold.length} dòng không chịu nhiệt.`,
  };
}

export function shouldAutoSplitOnLoaiHeatDowngrade(
  prevIsChiuNhiet: boolean | null | undefined,
  nextIsChiuNhiet: boolean | null | undefined,
): boolean {
  return prevIsChiuNhiet === true && nextIsChiuNhiet === false;
}

/** Trạng thái chu trình đang chặn tách catalog (mẻ TK / đã cấp phát). */
export const HEAT_SPLIT_BLOCKED_STATIONS = ["TIET_KHUAN", "CAP_PHAT"] as const;

export function isHeatSplitBlockedStation(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toUpperCase();
  return (HEAT_SPLIT_BLOCKED_STATIONS as readonly string[]).includes(s);
}

/** Bộ mẹ (có thành phần) không quét qua trạm / không nạp mẻ. */
export function rejectParentBoScan(input: {
  /** Catalog: có ≥1 bộ con parent_bo_id. */
  hasChildComponents?: boolean | null;
  /** Legacy quy trình: MAIN hoặc còn SUB. */
  maVaiTroBo?: string | null;
  hasActiveSub?: boolean | null;
}): string | null {
  if (input.hasChildComponents === true) {
    return "Bộ mẹ đã tách thành phần — chỉ quét bộ thành phần (chịu nhiệt / không chịu nhiệt).";
  }
  const role = String(input.maVaiTroBo || "").trim().toUpperCase();
  if (role === "MAIN" || input.hasActiveSub === true) {
    return "Bộ mẹ đã tách thành phần — chỉ quét bộ thành phần, không quét bộ mẹ.";
  }
  return null;
}
