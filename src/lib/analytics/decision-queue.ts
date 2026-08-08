/**
 * Hàng đợi quyết định ngày — Command Center.
 * Derive từ gap / BK / CSSD / NKBV / QLCV. Không đổi CCS.
 */

import { SUPERVISION_COMPLIANCE_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";
import { buildQlcvAnalyticsDeepLink } from "@/lib/analytics/qlcv-analytics-deep-link";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";
import { buildAnalyticsDeepLink } from "@/modules/dashboard/lib/bao-cao-tong-hop-core";

export type DecisionSeverity = "red" | "yellow";

export type DecisionQueueItem = {
  id: string;
  severity: DecisionSeverity;
  domain: "VST" | "GSC" | "CSSD" | "NKBV" | "QLCV";
  title: string;
  detail: string;
  metricLabel: string;
  href: string;
  /** Deep-link tạo việc QLCV có metadata PDCA (nếu áp dụng). */
  createTaskHref?: string;
};

type GapLike = {
  id?: string | null;
  ten?: string | null;
  ma_khoa?: string | null;
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

function defaultRemeasureDate(denNgay: string): string {
  const d = new Date(`${denNgay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 14);
  return d.toISOString().slice(0, 10);
}

const MAX_ITEMS = 10;

/** Xây hàng đợi tối đa 10 dòng, Đỏ trước Vàng. */
export function buildDecisionQueue(input: {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  vstGaps?: GapLike[] | null;
  gscGaps?: GapLike[] | null;
  checklistOverview?: ChecklistLike[] | null;
  cssdRedAlert?: number | null;
  cssdFrozen?: number | null;
  nkbvChoXn?: number | null;
  qlcvOverdueCount?: number | null;
  qlcvOverdueHref?: string;
}): DecisionQueueItem[] {
  const items: DecisionQueueItem[] = [];
  const khoaIds = input.selectedKhoaIds.length === 1 ? input.selectedKhoaIds : undefined;
  const vstHref = buildAnalyticsDeepLink(
    "/thong-ke/vst",
    { tu_ngay: input.tuNgay, den_ngay: input.denNgay, khoa_ids: khoaIds },
    "dashboard",
  );
  const gscHref = buildAnalyticsDeepLink(
    "/thong-ke/gsc",
    { tu_ngay: input.tuNgay, den_ngay: input.denNgay, khoa_ids: khoaIds },
    "dashboard",
  );
  const kyDoLai = defaultRemeasureDate(input.denNgay);

  const gaps = [
    ...(input.vstGaps ?? []).map((r) => ({ domain: "VST" as const, row: r })),
    ...(input.gscGaps ?? []).map((r) => ({ domain: "GSC" as const, row: r })),
  ]
    .filter(({ row }) => isComparable(row))
    .map(({ domain, row }) => ({
      domain,
      ten: String(row.ten || "Khoa").trim() || "Khoa",
      khoaId: String(row.id || "").trim() || undefined,
      delta: gapAbs(row),
      tyKsnk: row.ty_le_ksnk ?? null,
    }))
    .sort((a, b) => b.delta - a.delta);

  for (const g of gaps.slice(0, 4)) {
    if (g.delta < 5) continue;
    const severity: DecisionSeverity =
      g.delta >= 15 ||
      (g.tyKsnk != null && g.tyKsnk < SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN)
        ? "red"
        : "yellow";
    const href = g.domain === "VST" ? vstHref : gscHref;
    items.push({
      id: `gap-${g.domain}-${g.ten}`,
      severity,
      domain: g.domain,
      title: `Đối soát ${g.domain} · ${g.ten}`,
      detail: `Chênh TGS–KSNK ≈ ${Math.round(g.delta)} điểm — cần rà soát và giao việc theo dõi.`,
      metricLabel: `Δ ${Math.round(g.delta)} điểm`,
      href,
      createTaskHref: buildQlcvAnalyticsDeepLink({
        topic: `Đối soát ${g.domain}`,
        gap: `Δ TGS–KSNK ≈ ${Math.round(g.delta)} điểm`,
        khoaLabel: g.ten,
        openCreate: true,
        chiSo: g.domain === "VST" ? "ty_le_vst" : "ty_le_gsc",
        khoaId: g.khoaId,
        kyDoLai,
        giaTriLucTao: g.tyKsnk != null ? Math.round(Number(g.tyKsnk) * 10) / 10 : null,
      }),
    });
  }

  const bkViolations = (b: ChecklistLike) => Number(b.tong_vi_pham ?? b.so_vi_pham ?? 0);
  const weakBks = [...(input.checklistOverview ?? [])]
    .filter((b) => b.ty_le_tuan_thu != null || bkViolations(b) > 0)
    .sort((a, b) => {
      const ta = a.ty_le_tuan_thu ?? 100;
      const tb = b.ty_le_tuan_thu ?? 100;
      if (ta !== tb) return ta - tb;
      return bkViolations(b) - bkViolations(a);
    });

  const weakBk = weakBks[0];
  if (
    weakBk &&
    (weakBk.ty_le_tuan_thu == null ||
      weakBk.ty_le_tuan_thu < SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT ||
      bkViolations(weakBk) > 0)
  ) {
    const code = String(weakBk.ma_bk || weakBk.ma_bang_kiem || "").trim();
    const ten = String(weakBk.ten_bang_kiem || code || "Bảng kiểm").trim();
    const pct = weakBk.ty_le_tuan_thu;
    const severity: DecisionSeverity =
      pct != null && pct < SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN ? "red" : "yellow";
    const href = code
      ? `${gscHref}${gscHref.includes("?") ? "&" : "?"}bk=${encodeURIComponent(code)}`
      : gscHref;
    items.push({
      id: `bk-${code || ten}`,
      severity,
      domain: "GSC",
      title: `BK cần can thiệp: ${ten}`,
      detail: `Tuân thủ ${pct != null ? `${Math.round(pct)}%` : "—"}${
        bkViolations(weakBk) > 0 ? ` · ${bkViolations(weakBk)} vi phạm` : ""
      }.`,
      metricLabel: pct != null ? `${Math.round(pct)}%` : "BK",
      href,
      createTaskHref: buildQlcvAnalyticsDeepLink({
        topic: "Can thiệp bảng kiểm",
        gap: pct != null ? `Tuân thủ ${Math.round(pct)}%` : "BK rủi ro",
        bkLabel: ten,
        openCreate: true,
        chiSo: "ty_le_gsc",
        kyDoLai,
        giaTriLucTao: pct != null ? Math.round(Number(pct) * 10) / 10 : null,
      }),
    });
  }

  const red = Number(input.cssdRedAlert ?? 0);
  const frozen = Number(input.cssdFrozen ?? 0);
  if (red > 0 || frozen > 0) {
    items.push({
      id: "cssd-ops-alert",
      severity: red > 0 ? "red" : "yellow",
      domain: "CSSD",
      title: "CSSD vận hành bất thường",
      detail: [
        red > 0 ? `${red} cảnh báo đỏ` : null,
        frozen > 0 ? `${frozen} bộ đóng băng` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      metricLabel: red > 0 ? `${red} đỏ` : `${frozen} đóng băng`,
      href: cssdReportAnalyticsHref({
        tab: red > 0 ? "incident" : "volume",
        from: input.tuNgay,
        to: input.denNgay,
      }),
      createTaskHref: buildQlcvAnalyticsDeepLink({
        topic: "CSSD vận hành",
        gap: red > 0 ? `${red} cảnh báo đỏ` : `${frozen} đóng băng`,
        openCreate: true,
        chiSo: "cssd_red_alert",
        kyDoLai,
        giaTriLucTao: red > 0 ? red : frozen,
      }),
    });
  }

  const choXn = Number(input.nkbvChoXn ?? 0);
  if (choXn > 0) {
    items.push({
      id: "nkbv-cho-xn",
      severity: choXn >= 5 ? "red" : "yellow",
      domain: "NKBV",
      title: "NKBV chờ xác nhận",
      detail: `${choXn} phiếu đang ghi / chờ XN trong kỳ — cần xử lý backlog.`,
      metricLabel: `${choXn} phiếu`,
      href: buildAnalyticsDeepLink(
        "/giam-sat-nkbv",
        { tu_ngay: input.tuNgay, den_ngay: input.denNgay, khoa_ids: khoaIds },
        "dashboard",
      ),
      createTaskHref: buildQlcvAnalyticsDeepLink({
        topic: "NKBV chờ xác nhận",
        gap: `${choXn} phiếu chờ XN`,
        openCreate: true,
        chiSo: "nkbv_cho_xn",
        kyDoLai,
        giaTriLucTao: choXn,
      }),
    });
  }

  const overdue = Number(input.qlcvOverdueCount ?? 0);
  if (overdue > 0) {
    items.push({
      id: "qlcv-overdue",
      severity: overdue >= 3 ? "red" : "yellow",
      domain: "QLCV",
      title: "Việc quá hạn",
      detail: `${overdue} công việc quá hạn trên board QLCV.`,
      metricLabel: `${overdue} việc`,
      href: input.qlcvOverdueHref || "/quan-ly-cong-viec",
    });
  }

  const rank = (s: DecisionSeverity) => (s === "red" ? 0 : 1);
  return items.sort((a, b) => rank(a.severity) - rank(b.severity) || a.domain.localeCompare(b.domain)).slice(0, MAX_ITEMS);
}
