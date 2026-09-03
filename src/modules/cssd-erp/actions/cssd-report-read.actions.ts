"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdReportView } from "@/lib/cssd-server-gates";
import {
  classifyIncidentGroupByTypeName,
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
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
import { isSetReconcileDraftAttr } from "@/modules/cssd-su-co/domain/cssd-set-reconcile-attrs";
import { getErrorMessage, tableHasColumn } from "../shared/cssd-db-utils";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import {
  computeBoByKhoa,
  computeCapPhatByKhoaNhan,
  computeMayUsage,
  computeMeQcSummary,
  computeReuseFrequency,
  computeStaffScans,
  computeStationVolume,
  computeStationVolumeTrend,
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
  type CssdStationVolumeRow,
  type CssdVolumeBucket,
  type CssdVolumeTrendPoint,
  CSSD_ANALYTICS_STATIONS,
} from "@/lib/analytics/cssd-metrics/cssd-analytics-core";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_REPORT_ROWS = 8000;

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

export async function fetchCssdReportBundle(filters: CssdReportFilters) {
  try {
    await verifyCssdReportView();
    const supabase = createAdminSupabaseClient();
    const from = String(filters.from || "").trim();
    const to = String(filters.to || "").trim();
    const station = String(filters.station || "ALL").trim();

    const [resQ, resS] = await Promise.all([
      supabase
        .from("v_cssd_quy_trinh_full")
        .select("*")
        .eq("is_active", true)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`)
        .limit(MAX_REPORT_ROWS),
      supabase
        .from("v_cssd_su_co_full")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`)
        .limit(MAX_REPORT_ROWS),
    ]);

    if (resQ.error) return { success: false as const, error: resQ.error.message, quyTrinh: [], suCo: [] };
    if (resS.error) return { success: false as const, error: resS.error.message, quyTrinh: [], suCo: [] };

    const redIds = new Set<string>();
    const redQrs = new Set<string>();
    const suCoSource = (resS.data || []).filter((x) => {
      const attrs = (x.attributes as Record<string, unknown>) || {};
      return !isSetReconcileDraftAttr(attrs);
    });
    for (const sc of suCoSource) {
      if ((sc as { is_red_alert?: boolean }).is_red_alert !== true) continue;
      const qid = String((sc as { quy_trinh_id?: string | null }).quy_trinh_id || "").trim();
      const qr = String((sc as { ma_qr_quy_trinh?: string | null }).ma_qr_quy_trinh || "")
        .trim()
        .toUpperCase();
      if (qid) redIds.add(qid);
      if (qr) redQrs.add(qr);
    }

    const quyTrinhRows = (resQ.data || []).map((x: Record<string, unknown>) => {
      const id = String(x.id || "");
      const qr = String(x.ma_qr_quy_trinh || "").trim().toUpperCase();
      const fromSuCo = redIds.has(id) || (qr ? redQrs.has(qr) : false);
      return {
        ...x,
        is_red_alert: x.is_red_alert === true || fromSuCo,
        ma_vach_qr: x.ma_qr_quy_trinh,
        trang_thai_hien_tai: x.ma_trang_thai_hien_tai,
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
        fault_operator: String(attrs.FAULT_OPERATOR || attrs.NGUOI_PHAT_HIEN || ""),
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
  suCoKyCount: number;
};

function emptyAnalyticsBundle(): CssdAnalyticsBundle {
  const stationVolume = CSSD_ANALYTICS_STATIONS.map((station) => ({
    station,
    label: station.replace(/_/g, " "),
    completed: 0,
  }));
  const meQc = { so_me_ky: 0, so_me_da_qc: 0, so_me_dat: 0, ty_le_qc_dat_me: null as number | null };
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
      tyLeQuyTrinhKhongSuCo: 100,
      soBo: 0,
      meQc,
      mayReady: 0,
      mayRepairing: 0,
      redAlertTotal: 0,
      frozenTotal: 0,
    }),
    tyLeQuyTrinhKhongSuCo: 100,
    quyTrinhKyCount: 0,
    suCoKyCount: 0,
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

    const toEnd = `${to}T23:59:59`;
    /** Lookback để bắt chu trình tạo trước kỳ nhưng hoàn thành trạm trong kỳ. */
    const lookback = new Date(`${from}T00:00:00Z`);
    lookback.setUTCDate(lookback.getUTCDate() - 90);
    const lookbackFrom = lookback.toISOString().slice(0, 10);

    const quyTrinhSelect = await buildQuyTrinhAnalyticsSelect(supabase);
    const [resQ, resS, resBo, resMe, resTb, resBt, resKhoa] = await Promise.all([
      supabase
        .from("v_cssd_quy_trinh_full")
        .select(quyTrinhSelect)
        .eq("is_active", true)
        .gte("created_at", lookbackFrom)
        .lte("created_at", toEnd)
        .limit(MAX_REPORT_ROWS),
      supabase
        .from("v_cssd_su_co_full")
        .select("id, attributes")
        .gte("created_at", from)
        .lte("created_at", toEnd)
        .limit(MAX_REPORT_ROWS),
      supabase
        .from("cssd_dm_bo_dung_cu")
        .select("id, khoa_su_dung_id, is_active")
        .eq("is_active", true)
        .limit(5000),
      supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("id, thiet_bi_id, ket_qua_test, thoi_gian_bat_dau, created_at, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi)")
        .eq("is_active", true)
        .gte("created_at", lookbackFrom)
        .lte("created_at", toEnd)
        .limit(MAX_REPORT_ROWS),
      supabase.from("cssd_dm_thiet_bi").select("id, trang_thai").eq("is_active", true).limit(500),
      supabase
        .from("cssd_fact_bao_tri")
        .select("id", { count: "exact", head: true })
        .eq("trang_thai", "DANG_THUC_HIEN"),
      supabase.from("mdm_dm_khoa_phong").select("id, ten_khoa, ma_khoa").limit(2000),
    ]);

    if (resQ.error) return { success: false, error: resQ.error.message, data: empty };
    if (resBo.error) return { success: false, error: resBo.error.message, data: empty };
    if (resMe.error) return { success: false, error: resMe.error.message, data: empty };

    const khoaMap = new Map<string, string>();
    for (const k of resKhoa.data || []) {
      const row = k as { id: string; ten_khoa?: string; ma_khoa?: string };
      khoaMap.set(
        String(row.id),
        formatKhoaCompactLabel({ ma_khoa: row.ma_khoa, ten_khoa: row.ten_khoa }),
      );
    }

    const quyTrinh = ((resQ.data || []) as unknown as CssdQuyTrinhAnalyticsRow[]).map((r) => {
      const next = { ...r };
      const kidNhan = String(r.khoa_nhan_id || "").trim();
      const compactNhan = kidNhan ? khoaMap.get(kidNhan) : undefined;
      if (compactNhan) next.ten_khoa_nhan = compactNhan;
      const kidSoHuu = String(r.khoa_su_dung_id || "").trim();
      const compactSoHuu = kidSoHuu ? khoaMap.get(kidSoHuu) : undefined;
      if (compactSoHuu) next.ten_khoa = compactSoHuu;
      return next;
    });
    const suCoKyCount = (resS.data || []).filter((x) => {
      const attrs = (x.attributes as Record<string, unknown>) || {};
      return !isSetReconcileDraftAttr(attrs);
    }).length;
    const quyTrinhKyCount = quyTrinh.filter((r) => {
      const day =
        String(r.thoi_gian_tiep_nhan || "").slice(0, 10) || String(r.created_at || "").slice(0, 10);
      return day >= from && day <= to;
    }).length;
    const tyLe = roundIncidentFreeRate(quyTrinhKyCount, suCoKyCount);

    const stationVolume = computeStationVolume(quyTrinh, from, to);
    const pointsDay = computeStationVolumeTrend(quyTrinh, from, to, "day", stationFilter);
    const pointsMonth = computeStationVolumeTrend(quyTrinh, from, to, "month", stationFilter);
    const pointsYear = computeStationVolumeTrend(quyTrinh, from, to, "year", stationFilter);

    const boRows = (resBo.data || []).map((b: Record<string, unknown>) => {
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

    const meRows = (resMe.data || [])
      .map((m: Record<string, unknown>) => {
        const tb = m.thiet_bi as { ten_thiet_bi?: string } | { ten_thiet_bi?: string }[] | null;
        const ten = Array.isArray(tb) ? String(tb[0]?.ten_thiet_bi || "") : String(tb?.ten_thiet_bi || "");
        const day =
          String(m.thoi_gian_bat_dau || "").slice(0, 10) || String(m.created_at || "").slice(0, 10);
        return {
          thiet_bi_id: m.thiet_bi_id ? String(m.thiet_bi_id) : null,
          ten_thiet_bi: ten || null,
          ket_qua_test: m.ket_qua_test == null ? null : Boolean(m.ket_qua_test),
          _day: day,
        };
      })
      .filter((m) => m._day >= from && m._day <= to);
    const meQc = computeMeQcSummary(meRows);
    const mayUsage = computeMayUsage(meRows);

    let mayReady = 0;
    let mayRepairing = 0;
    for (const tb of resTb.data || []) {
      const st = String((tb as { trang_thai?: string }).trang_thai || "").toUpperCase();
      if (st === "READY" || st === "HOAT_DONG" || st === "SAN_SANG") mayReady += 1;
      else if (st === "REPAIRING" || st === "BAO_TRI" || st === "BROKEN") mayRepairing += 1;
    }
    const phieuBaoTriMo = resBt.count ?? 0;

    const staffRaw = computeStaffScans(quyTrinh, from, to);
    const staffIds = [...new Set(staffRaw.map((s) => s.nguoi_id))];
    const nameMap = new Map<string, { ho_ten: string; ma_nv: string }>();
    if (staffIds.length > 0) {
      const { data: ns } = await supabase
        .from("mdm_nhan_su")
        .select("id, ho_ten, ma_nv")
        .in("id", staffIds.slice(0, 500));
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
