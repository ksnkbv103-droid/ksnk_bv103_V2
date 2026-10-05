"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdReportView } from "@/lib/cssd-server-gates";
import {
  classifyIncidentGroupByTypeName,
  CAUSE_CLASS_LABEL,
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  type CauseClass,
  type IncidentGroup,
} from "@/modules/cssd-su-co/domain/cssd-incident-taxonomy";
import {
  readCauseClass,
  readCauseLabel,
  readIncidentGroup,
  readMaLo,
} from "@/modules/cssd-su-co/domain/cssd-incident-attributes";
import {
  INCIDENT_STATUS_LABEL,
  readIncidentConfirmedAt,
  readIncidentConfirmedByName,
  readIncidentPhieuStatus,
} from "@/modules/cssd-su-co/domain/cssd-incident-status";
import {
  collectReportRedQuyTrinhIds,
  countsTowardCssdSafetyTally,
} from "@/modules/cssd-su-co/domain/cssd-incident-attributes";
import { getErrorMessage, tableHasColumn } from "../shared/cssd-db-utils";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import {
  computeBoByKhoa,
  computeCapPhatByKhoaNhan,
  computeMayUsage,
  computeMeQcSummary,
  computeReuseFrequency,
  computeStaffScans,
  computeStationIncidentRates,
  computeStationVolume,
  computeStationVolumeTrend,
  countCyclesWithProcessIncidents,
  pivotVolumeTrendTotals,
  roundIncidentFreeRate,
  summarizeCssdAnalyticsBrief,
  type CssdAnalyticsStation,
  type CssdBoByKhoaRow,
  type CssdCapPhatByKhoaNhanRow,
  type CssdMayUsageRow,
  type CssdMeQcSummary,
  type CssdQuyTrinhAnalyticsRow,
  type CssdReuseRow,
  type CssdStaffScanRow,
  type CssdStationIncidentRateRow,
  type CssdStationVolumeRow,
  type CssdVolumeBucket,
  type CssdVolumeTrendPoint,
  CSSD_ANALYTICS_STATIONS,
  cssdVnDay,
  stationLabel,
} from "@/lib/analytics/cssd-metrics/cssd-analytics-core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysYmd } from "@/lib/format-datetime-vi";
import { isRejectedLegacyHexBoQr } from "@/lib/domain/cssd-bo-ma";
import { CSSD_ACTIVE_PAGE_SIZE, nextActivePageFrom } from "../helpers/cssd-active-page";

/** Đọc hết các trang PostgREST (không cắt im lặng ở 1000 / 8000 dòng). */
async function fetchAllReportRows<T>(
  load: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await load(from, from + CSSD_ACTIVE_PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };
    const chunk = (data ?? []) as T[];
    rows.push(...chunk);
    const next = nextActivePageFrom(chunk.length, from);
    if (next == null) return { rows, error: null };
    from = next;
  }
}

/** Cửa sổ server nới ±1 ngày quanh kỳ; lọc đúng ngày VN ở client (`cssdVnDay`). */
function reportTimestampWindow(from: string, to: string, columns: readonly string[]): string {
  const lo = addDaysYmd(from, -1);
  const hi = `${addDaysYmd(to, 1)}T23:59:59`;
  return columns.map((c) => `and(${c}.gte.${lo},${c}.lte.${hi})`).join(",");
}

/**
 * RP1 (S-F): báo cáo lịch sử đọc mọi chu kỳ (kể cả đã đóng khi tiếp nhận lại / thu hồi),
 * không lọc `is_active` — chỉ bỏ tem hex legacy đã vô hiệu từ cutover A′.
 */
function quyTrinhHistoryWindowFilter(from: string, to: string): string {
  return reportTimestampWindow(from, to, [
    "created_at",
    "thoi_gian_tiep_nhan",
    "thoi_gian_lam_sach",
    "thoi_gian_qc",
    "thoi_gian_dong_goi",
    "thoi_gian_tiet_khuan",
    "thoi_gian_cap_phat",
  ]);
}

/** S-I: mẻ tạo trước kỳ nhưng bắt đầu trong kỳ vẫn vào cửa sổ (cùng ±1 ngày như chu kỳ). */
function mePeriodWindowFilter(from: string, to: string): string {
  return reportTimestampWindow(from, to, ["created_at", "thoi_gian_bat_dau"]);
}

function isLegacyHexCycle(row: { ma_qr_quy_trinh?: unknown }): boolean {
  return isRejectedLegacyHexBoQr(String(row.ma_qr_quy_trinh || ""));
}

export type CssdReportFilters = {
  from: string;
  to: string;
  station: string;
};

function parseIncidentType(raw: string): { group: IncidentGroup; typeName: string } {
  const text = String(raw || "").trim();
  const [prefix, rest] = text.split(":", 2);
  if (INCIDENT_GROUPS.includes(prefix as IncidentGroup) && rest) {
    return { group: prefix as IncidentGroup, typeName: rest };
  }
  return { group: classifyIncidentGroupByTypeName(text), typeName: text || "Chưa phân loại" };
}

/** Cột luôn có trên view từ consolidation 20260622. */
const QUY_TRINH_ANALYTICS_BASE = [
  "id",
  "bo_dung_cu_id",
  "ma_bo",
  "ten_bo",
  "ten_khoa",
  "suds_count",
  "created_at",
  "ma_trang_thai_hien_tai",
  "thoi_gian_tiep_nhan",
  "thoi_gian_lam_sach",
  "thoi_gian_qc",
  "thoi_gian_dong_goi",
  "thoi_gian_tiet_khuan",
  "thoi_gian_cap_phat",
  "nguoi_tiep_nhan_id",
  "nguoi_lam_sach_id",
  "nguoi_kiem_tra_id",
  "nguoi_dong_goi_id",
  "nguoi_tiet_khuan_id",
  "nguoi_cap_phat_id",
] as const;

/** Cột additive — chỉ SELECT khi view đã migrate (`20260729…khoa_nhan_id`). */
const QUY_TRINH_ANALYTICS_OPTIONAL = ["khoa_su_dung_id", "khoa_nhan_id", "ten_khoa_nhan"] as const;

async function buildQuyTrinhAnalyticsSelect(supabase: SupabaseClient): Promise<string> {
  const cols: string[] = [...QUY_TRINH_ANALYTICS_BASE];
  for (const col of QUY_TRINH_ANALYTICS_OPTIONAL) {
    if (await tableHasColumn(supabase, "v_cssd_quy_trinh_full", col)) cols.push(col);
  }
  return cols.join(",");
}

/** Sự cố báo cáo — đủ cột parse incident; không select(*). */
const SU_CO_REPORT_SELECT =
  "id, quy_trinh_id, is_red_alert, ma_loai_su_co, ten_loai_su_co, incident_group, incident_type_label, ma_qr_quy_trinh, ma_tram_phat_hien, ma_tram_gay_loi, mo_ta, attributes, created_at, is_active";

export async function fetchCssdReportBundle(filters: CssdReportFilters) {
  try {
    await verifyCssdReportView();
    const supabase = createAdminSupabaseClient();
    const from = String(filters.from || "").trim();
    const to = String(filters.to || "").trim();
    const station = String(filters.station || "ALL").trim();

    // A) select(*). B) analytics/report projection đã có sẵn — chọn B.
    const quyTrinhSelect = [
      await buildQuyTrinhAnalyticsSelect(supabase),
      "ma_qr_quy_trinh",
      "is_red_alert",
      "is_active",
    ].join(",");

    const [resQ, resS] = await Promise.all([
      fetchAllReportRows<Record<string, unknown>>((pFrom, pTo) =>
        supabase
          .from("v_cssd_quy_trinh_full")
          .select(quyTrinhSelect)
          .gte("created_at", from)
          .lte("created_at", `${to}T23:59:59`)
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
      fetchAllReportRows<Record<string, unknown>>((pFrom, pTo) =>
        supabase
          .from("v_cssd_su_co_full")
          .select(SU_CO_REPORT_SELECT)
          .gte("created_at", from)
          .lte("created_at", `${to}T23:59:59`)
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
    ]);

    if (resQ.error) return { success: false as const, error: resQ.error, quyTrinh: [], suCo: [] };
    if (resS.error) return { success: false as const, error: resS.error, quyTrinh: [], suCo: [] };

    const suCoSource = resS.rows.filter((x) => {
      const attrs = (x.attributes as Record<string, unknown>) || {};
      return countsTowardCssdSafetyTally(attrs);
    });
    const redIds = collectReportRedQuyTrinhIds(
      suCoSource as { quy_trinh_id?: string | null; is_red_alert?: boolean | null; attributes?: Record<string, unknown> | null }[],
    );

    const quyTrinhRows = resQ.rows.filter((x) => !isLegacyHexCycle(x)).map((x: Record<string, unknown>) => {
      const id = String(x.id || "");
      const fromSuCo = redIds.has(id);
      return {
        ...x,
        is_red_alert: x.is_red_alert === true || fromSuCo,
        ma_vach_qr: x.ma_qr_quy_trinh,
        trang_thai_hien_tai: x.ma_trang_thai_hien_tai,
        chu_ky_label: x.is_active === false ? "Đã đóng" : "Đang lưu hành",
      };
    });

    const suCoRows = suCoSource.map((x: Record<string, unknown>) => {
      const attrs = (x.attributes as Record<string, unknown>) || {};
      const parsed = parseIncidentType(String(x.ma_loai_su_co || ""));
      const viewGroup = String(x.incident_group || "").trim();
      const attrGroup = readIncidentGroup(attrs);
      const group = INCIDENT_GROUPS.includes(viewGroup as IncidentGroup)
        ? (viewGroup as IncidentGroup)
        : INCIDENT_GROUPS.includes(attrGroup as IncidentGroup)
          ? (attrGroup as IncidentGroup)
          : parsed.group;
      const typeLabel = String(x.incident_type_label || parsed.typeName || "").trim();
      const causeClass = readCauseClass(attrs);
      const causeLabel =
        readCauseLabel(attrs) ||
        (causeClass && causeClass in CAUSE_CLASS_LABEL
          ? CAUSE_CLASS_LABEL[causeClass as CauseClass]
          : "") ||
        String(x.ten_loai_su_co || "").trim();
      const incidentStatus = readIncidentPhieuStatus(attrs);
      return {
        ...x,
        ma_vach_qr: x.ma_qr_quy_trinh,
        tram_phat_hien: x.ma_tram_phat_hien,
        tram_gay_loi: x.ma_tram_gay_loi,
        loai_su_co: typeLabel || parsed.typeName,
        incident_group: group,
        incident_group_label: INCIDENT_GROUP_LABEL[group],
        fault_operator: String(attrs.FAULT_OPERATOR || ""),
        nguoi_phat_hien: String(attrs.NGUOI_PHAT_HIEN || ""),
        reporter_email: String(attrs.REPORTER_EMAIL || ""),
        cause_class: causeClass || "",
        cause_label: causeLabel || "Chưa phân loại",
        ma_lo: readMaLo(attrs) || String(attrs.ERROR_QR || "").trim(),
        mo_ta_ngan: String(x.mo_ta || "").trim(),
        incident_status: incidentStatus,
        incident_status_label: INCIDENT_STATUS_LABEL[incidentStatus],
        incident_confirmed_at: readIncidentConfirmedAt(attrs),
        incident_confirmed_by_name: readIncidentConfirmedByName(attrs),
      };
    });

    const stationFilteredSuCo =
      station === "ALL" ? suCoRows : suCoRows.filter((x) => String(x.tram_phat_hien || "") === station);
    const stationFilteredQuyTrinh =
      station === "ALL"
        ? quyTrinhRows
        : quyTrinhRows.filter((x) => String(x.trang_thai_hien_tai || "") === station);

    return { success: true as const, quyTrinh: stationFilteredQuyTrinh, suCo: stationFilteredSuCo };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), quyTrinh: [], suCo: [] };
  }
}

export type CssdAnalyticsBundle = {
  stationVolume: CssdStationVolumeRow[];
  volumeTrendDay: { bucket: string; total: number }[];
  volumeTrendMonth: { bucket: string; total: number }[];
  volumeTrendYear: { bucket: string; total: number }[];
  volumeTrendPoints: CssdVolumeTrendPoint[];
  boByKhoa: CssdBoByKhoaRow[];
  /** Lượt cấp phát kỳ theo khoa nhận (SSOT destination). */
  capPhatByKhoaNhan: CssdCapPhatByKhoaNhanRow[];
  reuseRows: CssdReuseRow[];
  meQc: CssdMeQcSummary;
  mayUsage: CssdMayUsageRow[];
  mayReady: number;
  mayRepairing: number;
  phieuBaoTriMo: number;
  staffScans: Array<CssdStaffScanRow & { ho_ten: string; ma_nv: string }>;
  brief: ReturnType<typeof summarizeCssdAnalyticsBrief>;
  tyLeQuyTrinhKhongSuCo: number | null;
  quyTrinhKyCount: number;
  /** Số chu trình có ≥1 SC PROCESS (tử KPI) — không đếm phiếu. */
  suCoKyCount: number;
  stationIncidentRates: CssdStationIncidentRateRow[];
};

function emptyAnalyticsBundle(): CssdAnalyticsBundle {
  const stationVolume = CSSD_ANALYTICS_STATIONS.map((station) => ({
    station,
    label: stationLabel(station),
    completed: 0,
  }));
  const meQc = {
    so_me_ky: 0,
    so_me_da_qc: 0,
    so_me_dat: 0,
    ty_le_qc_dat_me: null as number | null,
    biDuong: 0,
    bdHong: 0,
    so_me_thu_hoi_than_trong: 0,
  };
  return {
    stationVolume,
    volumeTrendDay: [],
    volumeTrendMonth: [],
    volumeTrendYear: [],
    volumeTrendPoints: [],
    boByKhoa: [],
    capPhatByKhoaNhan: [],
    reuseRows: [],
    meQc,
    mayUsage: [],
    mayReady: 0,
    mayRepairing: 0,
    phieuBaoTriMo: 0,
    staffScans: [],
    brief: summarizeCssdAnalyticsBrief({
      stationVolume,
      tyLeQuyTrinhKhongSuCo: null,
      soBo: 0,
      meQc,
      mayReady: 0,
      mayRepairing: 0,
      redAlertTotal: 0,
      frozenTotal: 0,
    }),
    tyLeQuyTrinhKhongSuCo: null,
    quyTrinhKyCount: 0,
    suCoKyCount: 0,
    stationIncidentRates: [],
  };
}

/**
 * Bundle analytics CSSD (sản lượng / bộ / máy / NV) — derive từ fact, không bảng summary.
 * Station filter chỉ áp cho trend/volume display (ALL = mọi trạm).
 */
export async function fetchCssdAnalyticsBundle(filters: {
  from: string;
  to: string;
  station?: string;
  volumeBucket?: CssdVolumeBucket;
}): Promise<{ success: true; data: CssdAnalyticsBundle } | { success: false; error: string; data: CssdAnalyticsBundle }> {
  const empty = emptyAnalyticsBundle();
  try {
    await verifyCssdReportView();
    const supabase = createAdminSupabaseClient();
    const from = String(filters.from || "").trim();
    const to = String(filters.to || "").trim();
    const stationRaw = String(filters.station || "ALL").trim();
    const stationFilter =
      stationRaw !== "ALL" && CSSD_ANALYTICS_STATIONS.includes(stationRaw as CssdAnalyticsStation)
        ? (stationRaw as CssdAnalyticsStation)
        : "ALL";

    const quyTrinhSelect = `${await buildQuyTrinhAnalyticsSelect(supabase)},ma_qr_quy_trinh`;
    const [resQ, resS, resBo, resMe, resTb, resBt, resKhoa] = await Promise.all([
      fetchAllReportRows<CssdQuyTrinhAnalyticsRow & { ma_qr_quy_trinh?: string | null }>((pFrom, pTo) =>
        supabase
          .from("v_cssd_quy_trinh_full")
          .select(quyTrinhSelect)
          .or(quyTrinhHistoryWindowFilter(from, to))
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
      fetchAllReportRows<{
        id?: string;
        quy_trinh_id?: string | null;
        ma_tram_phat_hien?: string | null;
        attributes?: Record<string, unknown> | null;
        created_at?: string | null;
      }>((pFrom, pTo) =>
        supabase
          .from("v_cssd_su_co_full")
          .select("id, quy_trinh_id, ma_tram_phat_hien, attributes, created_at")
          .or(reportTimestampWindow(from, to, ["created_at"]))
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
      fetchAllReportRows<{ id?: string; khoa_su_dung_id?: string | null; is_active?: boolean | null }>((pFrom, pTo) =>
        supabase
          .from("cssd_dm_bo_dung_cu")
          .select("id, khoa_su_dung_id, is_active")
          .eq("is_active", true)
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
      fetchAllReportRows<{
        id?: string;
        thiet_bi_id?: string | null;
        ket_qua_test?: boolean | null;
        thoi_gian_bat_dau?: string | null;
        created_at?: string | null;
        trang_thai_me?: string | null;
        trang_thai_bi?: string | null;
        tk_qc_json?: Record<string, unknown> | null;
        thiet_bi?: { ten_thiet_bi?: string } | { ten_thiet_bi?: string }[] | null;
      }>((pFrom, pTo) =>
        supabase
          .from("cssd_fact_lo_tiet_khuan")
          .select(
            "id, thiet_bi_id, ket_qua_test, thoi_gian_bat_dau, created_at, trang_thai_me, trang_thai_bi, tk_qc_json, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi)",
          )
          .eq("is_active", true)
          .or(mePeriodWindowFilter(from, to))
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
      fetchAllReportRows<{ id?: string; trang_thai?: string | null }>((pFrom, pTo) =>
        supabase
          .from("cssd_dm_thiet_bi")
          .select("id, trang_thai")
          .eq("is_active", true)
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
      supabase
        .from("cssd_fact_bao_tri")
        .select("id", { count: "exact", head: true })
        .eq("trang_thai", "DANG_THUC_HIEN"),
      fetchAllReportRows<{ id?: string; ten_khoa?: string | null; ma_khoa?: string | null }>((pFrom, pTo) =>
        supabase
          .from("mdm_dm_khoa_phong")
          .select("id, ten_khoa, ma_khoa")
          .order("id", { ascending: true })
          .range(pFrom, pTo),
      ),
    ]);

    if (resQ.error) return { success: false, error: resQ.error, data: empty };
    if (resS.error) return { success: false, error: resS.error, data: empty };
    if (resBo.error) return { success: false, error: resBo.error, data: empty };
    if (resMe.error) return { success: false, error: resMe.error, data: empty };
    if (resTb.error) return { success: false, error: resTb.error, data: empty };
    if (resKhoa.error) return { success: false, error: resKhoa.error, data: empty };

    const khoaMap = new Map<string, string>();
    for (const k of resKhoa.rows) {
      const row = k as { id: string; ten_khoa?: string; ma_khoa?: string };
      khoaMap.set(
        String(row.id),
        formatKhoaCompactLabel({ ma_khoa: row.ma_khoa, ten_khoa: row.ten_khoa }),
      );
    }

    const quyTrinh = resQ.rows.filter((r) => !isLegacyHexCycle(r)).map((r) => {
      const next = { ...r };
      const kidNhan = String(r.khoa_nhan_id || "").trim();
      const compactNhan = kidNhan ? khoaMap.get(kidNhan) : undefined;
      if (compactNhan) next.ten_khoa_nhan = compactNhan;
      const kidSoHuu = String(r.khoa_su_dung_id || "").trim();
      const compactSoHuu = kidSoHuu ? khoaMap.get(kidSoHuu) : undefined;
      if (compactSoHuu) next.ten_khoa = compactSoHuu;
      return next;
    });
    const quyTrinhKyCount = quyTrinh.filter((r) => {
      const day = cssdVnDay(r.thoi_gian_tiep_nhan) || cssdVnDay(r.created_at) || "";
      return day >= from && day <= to;
    }).length;
    const suCoInKy = resS.rows.filter((r) => {
      const day = cssdVnDay(r.created_at) || "";
      return day.length > 0 && day >= from && day <= to;
    });
    const suCoKyCount = countCyclesWithProcessIncidents(suCoInKy);
    const tyLe = roundIncidentFreeRate(quyTrinhKyCount, suCoKyCount);

    const stationVolume = computeStationVolume(quyTrinh, from, to);
    const stationIncidentRates = computeStationIncidentRates(stationVolume, suCoInKy);
    const pointsDay = computeStationVolumeTrend(quyTrinh, from, to, "day", stationFilter);
    const pointsMonth = computeStationVolumeTrend(quyTrinh, from, to, "month", stationFilter);
    const pointsYear = computeStationVolumeTrend(quyTrinh, from, to, "year", stationFilter);

    const boRows = resBo.rows.map((b) => {
      const khoaId = b.khoa_su_dung_id ? String(b.khoa_su_dung_id) : null;
      return {
        id: String(b.id),
        khoa_su_dung_id: khoaId,
        ten_khoa: khoaId ? khoaMap.get(khoaId) || null : null,
        is_active: b.is_active !== false,
      };
    });
    const boByKhoa = computeBoByKhoa(boRows);
    const capPhatByKhoaNhan = computeCapPhatByKhoaNhan(quyTrinh, from, to);
    const reuseRows = computeReuseFrequency(quyTrinh, from, to, 80);

    const meRows = resMe.rows
      .map((m) => {
        const tb = m.thiet_bi;
        const ten = Array.isArray(tb) ? String(tb[0]?.ten_thiet_bi || "") : String(tb?.ten_thiet_bi || "");
        const day = cssdVnDay(m.thoi_gian_bat_dau) || cssdVnDay(m.created_at) || "";
        return {
          thiet_bi_id: m.thiet_bi_id ? String(m.thiet_bi_id) : null,
          ten_thiet_bi: ten || null,
          ket_qua_test: m.ket_qua_test == null ? null : Boolean(m.ket_qua_test),
          trang_thai_me: m.trang_thai_me != null ? String(m.trang_thai_me) : null,
          trang_thai_bi: m.trang_thai_bi != null ? String(m.trang_thai_bi) : null,
          tk_qc_json:
            m.tk_qc_json && typeof m.tk_qc_json === "object"
              ? (m.tk_qc_json as Record<string, unknown>)
              : null,
          _day: day,
        };
      })
      .filter((m) => m._day >= from && m._day <= to);
    const meQc = computeMeQcSummary(meRows);
    const mayUsage = computeMayUsage(meRows);

    let mayReady = 0;
    let mayRepairing = 0;
    for (const tb of resTb.rows) {
      const st = String((tb as { trang_thai?: string }).trang_thai || "").toUpperCase();
      if (st === "READY" || st === "HOAT_DONG" || st === "SAN_SANG") mayReady += 1;
      else if (st === "REPAIRING" || st === "BAO_TRI" || st === "BROKEN") mayRepairing += 1;
    }
    const phieuBaoTriMo = resBt.count ?? 0;

    const staffRaw = computeStaffScans(quyTrinh, from, to);
    const staffIds = [...new Set(staffRaw.map((s) => s.nguoi_id))];
    const nameMap = new Map<string, { ho_ten: string; ma_nv: string }>();
    // PA1: chunk `.in` mọi id — hết cắt im 500 tên NV trên báo cáo sản lượng.
    const STAFF_NAME_CHUNK = 200;
    for (let i = 0; i < staffIds.length; i += STAFF_NAME_CHUNK) {
      const slice = staffIds.slice(i, i + STAFF_NAME_CHUNK);
      const { data: ns, error: nsErr } = await supabase
        .from("mdm_nhan_su")
        .select("id, ho_ten, ma_nv")
        .in("id", slice);
      if (nsErr) throw nsErr;
      for (const n of ns || []) {
        nameMap.set(String((n as { id: string }).id), {
          ho_ten: String((n as { ho_ten?: string }).ho_ten || "—"),
          ma_nv: String((n as { ma_nv?: string }).ma_nv || "—"),
        });
      }
    }
    const staffScans = staffRaw.map((s) => {
      const n = nameMap.get(s.nguoi_id);
      return { ...s, ho_ten: n?.ho_ten || "—", ma_nv: n?.ma_nv || "—" };
    });

    const brief = summarizeCssdAnalyticsBrief({
      stationVolume,
      tyLeQuyTrinhKhongSuCo: tyLe,
      soBo: boRows.length,
      meQc,
      mayReady,
      mayRepairing,
      redAlertTotal: 0,
      frozenTotal: 0,
    });

    return {
      success: true,
      data: {
        stationVolume,
        volumeTrendDay: pivotVolumeTrendTotals(pointsDay),
        volumeTrendMonth: pivotVolumeTrendTotals(pointsMonth),
        volumeTrendYear: pivotVolumeTrendTotals(pointsYear),
        volumeTrendPoints: pointsDay,
        boByKhoa,
        capPhatByKhoaNhan,
        reuseRows,
        meQc,
        mayUsage,
        mayReady,
        mayRepairing,
        phieuBaoTriMo,
        staffScans,
        brief,
        tyLeQuyTrinhKhongSuCo: tyLe,
        quyTrinhKyCount,
        suCoKyCount,
        stationIncidentRates,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e), data: empty };
  }
}

/** Tóm tắt mỏng cho Command Center / BCTH — soft-fail ở caller. */
export async function fetchCssdAnalyticsBriefSummary(filters: {
  from: string;
  to: string;
}): Promise<{ success: true; data: CssdAnalyticsBundle["brief"] } | { success: false; error: string }> {
  const res = await fetchCssdAnalyticsBundle({ from: filters.from, to: filters.to, station: "ALL" });
  if (!res.success) return { success: false, error: res.error };
  return { success: true, data: res.data.brief };
}
