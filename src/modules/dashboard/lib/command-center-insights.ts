/**
 * Gợi ý hành động nhẹ cho Command Center — text từ gap / BK vi phạm.
 * Không AI; không đổi công thức CCS.
 */

export type CommandCenterInsight = {
  id: string;
  text: string;
  href?: string;
};

type GapLike = {
  ten?: string | null;
  do_lech?: number | null;
  ty_le_tgs?: number | null;
  ty_le_ksnk?: number | null;
  vol_tgs?: number | null;
  vol_ksnk?: number | null;
  tgs_quan_sat?: number | null;
  ksnk_quan_sat?: number | null;
  tgs_co_hoi?: number | null;
  ksnk_co_hoi?: number | null;
};

type ChecklistLike = {
  ma_bk?: string | null;
  ma_bang_kiem?: string | null;
  ten_bang_kiem?: string | null;
  ty_le_tuan_thu?: number | null;
  so_vi_pham?: number | null;
  tong_vi_pham?: number | null;
};

function isComparable(row: GapLike): boolean {
  const tgs = Number(row.vol_tgs ?? row.tgs_quan_sat ?? row.tgs_co_hoi ?? 0);
  const ksnk = Number(row.vol_ksnk ?? row.ksnk_quan_sat ?? row.ksnk_co_hoi ?? 0);
  return tgs > 0 && ksnk > 0;
}

function gapAbs(row: GapLike): number {
  if (row.do_lech != null) return Math.abs(Number(row.do_lech));
  return Math.abs(Number(row.ty_le_tgs ?? 0) - Number(row.ty_le_ksnk ?? 0));
}

/** Tối đa 3 gợi ý — ưu tiên gap lớn rồi BK tuân thủ thấp / vi phạm cao. */
export function buildCommandCenterInsights(input: {
  vstGaps?: GapLike[] | null;
  gscGaps?: GapLike[] | null;
  checklistOverview?: ChecklistLike[] | null;
  thongKeVstHref: string;
  thongKeGscHref: string;
}): CommandCenterInsight[] {
  const out: CommandCenterInsight[] = [];

  const gaps = [
    ...(input.vstGaps ?? []).map((r) => ({ domain: "VST" as const, row: r })),
    ...(input.gscGaps ?? []).map((r) => ({ domain: "GSC" as const, row: r })),
  ]
    .filter(({ row }) => isComparable(row))
    .map(({ domain, row }) => ({
      domain,
      ten: String(row.ten || "Khoa").trim() || "Khoa",
      delta: gapAbs(row),
    }))
    .sort((a, b) => b.delta - a.delta);

  if (gaps[0] && gaps[0].delta > 5) {
    const g = gaps[0];
    out.push({
      id: `gap-${g.domain}-${g.ten}`,
      text: `Ưu tiên đối soát ${g.domain} tại ${g.ten}: chênh TGS–KSNK ≈ ${Math.round(g.delta)} điểm — mở thống kê để xem chi tiết.`,
      href: g.domain === "VST" ? input.thongKeVstHref : input.thongKeGscHref,
    });
  }

  const bkCode = (b: ChecklistLike) => String(b.ma_bk || b.ma_bang_kiem || "").trim();
  const bkViolations = (b: ChecklistLike) => Number(b.tong_vi_pham ?? b.so_vi_pham ?? 0);

  const bks = [...(input.checklistOverview ?? [])]
    .filter((b) => b.ty_le_tuan_thu != null || bkViolations(b) > 0)
    .sort((a, b) => {
      const ta = a.ty_le_tuan_thu ?? 100;
      const tb = b.ty_le_tuan_thu ?? 100;
      if (ta !== tb) return ta - tb;
      return bkViolations(b) - bkViolations(a);
    });

  const weakBk = bks[0];
  if (weakBk && (weakBk.ty_le_tuan_thu == null || weakBk.ty_le_tuan_thu < 80 || bkViolations(weakBk) > 0)) {
    const code = bkCode(weakBk);
    const ten = String(weakBk.ten_bang_kiem || code || "bảng kiểm").trim();
    const pct = weakBk.ty_le_tuan_thu != null ? `${Math.round(weakBk.ty_le_tuan_thu)}%` : "—";
    const vp = bkViolations(weakBk);
    out.push({
      id: `bk-${code || ten}`,
      text: `Bảng kiểm cần can thiệp: ${ten} (tuân thủ ${pct}${vp > 0 ? `, ${vp} vi phạm` : ""}) — rà soát tiêu chí và khoa yếu.`,
      href: code
        ? `${input.thongKeGscHref}${input.thongKeGscHref.includes("?") ? "&" : "?"}bk=${encodeURIComponent(code)}`
        : input.thongKeGscHref,
    });
  }

  if (gaps.length >= 2 && gaps[1].delta > 5 && out.length < 3) {
    const g = gaps[1];
    out.push({
      id: `gap2-${g.domain}-${g.ten}`,
      text: `Theo dõi thêm ${g.domain} · ${g.ten} (Δ ≈ ${Math.round(g.delta)} điểm).`,
      href: g.domain === "VST" ? input.thongKeVstHref : input.thongKeGscHref,
    });
  }

  if (out.length === 0) {
    out.push({
      id: "ok-baseline",
      text: "Chưa thấy tín hiệu gap/BK nổi bật trong kỳ — duy trì giám sát định kỳ và mở báo cáo tổng hợp khi cần gửi lãnh đạo.",
      href: undefined,
    });
  }

  return out.slice(0, 3);
}
