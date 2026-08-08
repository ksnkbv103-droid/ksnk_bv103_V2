"use server";

import { verifyAnyPermission } from "@/lib/server-permission";
import { DASHBOARD_CC_WIDGET } from "@/lib/dashboard-command-center-widget-keys";
import { applyQlcvListScopeToQuery, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { ensureQlcvKsnkKhoaId } from "../lib/qlcv-action-guard";
import { QLCV_DINH_KY_TABLE } from "../lib/qlcv-dinh-ky-write";
import { FACT_CONG_VIEC_DINH_KY_ROW_SELECT } from "../lib/qlcv-dinh-ky-select";
import { filterMauDueInPeriod, type DinhKyMauForPeriod } from "../lib/qlcv-dinh-ky-period-match";
import { nextDinhKySpawnDates } from "../lib/qlcv-dinh-ky-schedule";
import { resolveQlcvPeriodRange } from "../lib/qlcv-period-range";

export type QlcvQuaHanBriefRow = {
  id: string;
  tieu_de: string;
  han_hoan_thanh: string | null;
  nguoi_phu_trach_ten: string | null;
  phan_tram_hoan_thanh: number;
};

export type QlcvDinhKyBrief = {
  activeMauCount: number;
  dueMauThisWeek: number;
  openDinhKyThisWeek: number;
  nextSpawnPreview: { tieu_de: string; nextDate: string }[];
};

export type QlcvQuaHanBrief = {
  totalCount: number;
  items: QlcvQuaHanBriefRow[];
  dinhKy: QlcvDinhKyBrief;
};

/** Tóm tắt việc quá hạn + định kỳ nội bộ KSNK — Command Center. */
export async function getQlcvQuaHanBrief(limit = 8): Promise<QlcvQuaHanBrief> {
  await verifyAnyPermission([
    { moduleKey: "CONG_VIEC", action: "view" },
    { moduleKey: "DASHBOARD", action: "view" },
    { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  ]);

  const { supabase } = await ensureQlcvKsnkKhoaId();
  const scope = await resolveQlcvListScope(supabase);
  const cap = Math.min(20, Math.max(1, limit));
  const week = resolveQlcvPeriodRange("WEEK");

  let countQ = supabase
    .from("v_qlcv_cong_viec_qua_han")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  countQ = applyQlcvListScopeToQuery(countQ, scope);

  let listQ = supabase
    .from("v_qlcv_cong_viec_qua_han")
    .select("id,tieu_de,han_hoan_thanh,nguoi_phu_trach_ten,phan_tram_hoan_thanh")
    .eq("is_active", true)
    .order("han_hoan_thanh", { ascending: true })
    .limit(cap);
  listQ = applyQlcvListScopeToQuery(listQ, scope);

  let openDkQ = supabase
    .from("v_qlcv_cong_viec_full")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("loai_cong_viec", "DINH_KY")
    .gte("han_hoan_thanh", week.startIso)
    .lte("han_hoan_thanh", week.endIso)
    .neq("trang_thai", "HOAN_THANH")
    .neq("trang_thai", "DA_HUY");
  openDkQ = applyQlcvListScopeToQuery(openDkQ, scope);

  const mauQ = supabase
    .from(QLCV_DINH_KY_TABLE)
    .select(FACT_CONG_VIEC_DINH_KY_ROW_SELECT)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(80);

  const [{ count, error: countErr }, { data, error: listErr }, { count: openDkCount, error: openDkErr }, { data: mauRows, error: mauErr }] =
    await Promise.all([countQ, listQ, openDkQ, mauQ]);

  if (countErr) throw new Error(countErr.message);
  if (listErr) throw new Error(listErr.message);
  if (openDkErr) throw new Error(openDkErr.message);
  if (mauErr) throw new Error(mauErr.message);

  const maus = (mauRows || []) as DinhKyMauForPeriod[];
  const dueMau = filterMauDueInPeriod(maus, week);
  const nextSpawnPreview = maus
    .map((m) => {
      const next = nextDinhKySpawnDates(m.ma_chu_ky, m.ngay_bat_dau, new Date(), {
        maxScanDays: 120,
        maxMatches: 1,
      })[0];
      return next ? { tieu_de: m.tieu_de, nextDate: next } : null;
    })
    .filter((x): x is { tieu_de: string; nextDate: string } => Boolean(x))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
    .slice(0, 5);

  return {
    totalCount: count ?? 0,
    items: (data || []) as QlcvQuaHanBriefRow[],
    dinhKy: {
      activeMauCount: maus.length,
      dueMauThisWeek: dueMau.length,
      openDinhKyThisWeek: openDkCount ?? 0,
      nextSpawnPreview,
    },
  };
}
