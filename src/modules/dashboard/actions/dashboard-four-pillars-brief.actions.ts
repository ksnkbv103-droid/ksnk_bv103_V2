"use server";

import { getGiamSatNkbvDashboardPayload } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-dashboard.actions";
import { getCssdStationFlowMap } from "@/modules/cssd-erp/actions/cssd-read.actions";
import { fetchCssdAnalyticsBundle } from "@/modules/cssd-erp/actions/cssd-report-read.actions";
import {
  describeCssdCapPhatByKhoaNhan,
  describeCssdKhoaOwnershipProxy,
} from "@/lib/analytics/cssd-metrics/cssd-analytics-core";
import { summarizeNkbvOutcomeRates } from "@/lib/analytics/pdca-remeasure";
import { fetchKsnkStaffSupervisionForOverview } from "./dashboard-ksnk-staff-stats.actions";
import { verifyCommandCenterShell } from "../lib/dashboard-command-center-access";

export type FourPillarsBrief = {
  cssd: {
    available: boolean;
    san_luong_cap_phat: number | null;
    red_alert_total: number | null;
    frozen_total: number | null;
    may_ready: number | null;
    may_repairing: number | null;
    so_me_ky: number | null;
    ty_le_qc_dat_me: number | null;
    /** Sở hữu danh mục (snapshot bộ). */
    ownership_summary: string | null;
    /** Cấp phát theo khoa nhận (SSOT destination khi có dữ liệu). */
    destination_summary: string | null;
  };
  nkbv: {
    available: boolean;
    choXn: number | null;
    tongPhieu: number | null;
    /** Rate/SIR tóm tắt — không vào CCS. */
    outcome_summary: string | null;
    clabsi_rate_per_1000: number | null;
    clabsi_sir: number | null;
  };
  staff: { available: boolean; so_nv: number | null; tong_phien_gs: number | null; tong_co_hoi_vst: number | null };
};

/**
 * Tóm tắt 4 trụ cho Command Center — soft-fail từng nguồn. Không gộp CSSD vào CCS.
 */
export async function fetchCommandCenterFourPillarsBrief(filters: {
  tu_ngay: string;
  den_ngay: string;
  khoa_id?: string;
}): Promise<FourPillarsBrief> {
  await verifyCommandCenterShell();

  const [nkbvSettled, cssdFlowSettled, cssdAnalyticsSettled, staffSettled] = await Promise.allSettled([
    getGiamSatNkbvDashboardPayload({
      tu_ngay: filters.tu_ngay,
      den_ngay: filters.den_ngay,
      khoa_ghi_nhan_id: filters.khoa_id,
    }),
    getCssdStationFlowMap(),
    fetchCssdAnalyticsBundle({ from: filters.tu_ngay, to: filters.den_ngay, station: "ALL" }),
    fetchKsnkStaffSupervisionForOverview({
      tuNgay: filters.tu_ngay,
      denNgay: filters.den_ngay,
      selectedKhoiIds: [],
      selectedKhoaIds: filters.khoa_id ? [filters.khoa_id] : [],
      selectedNgheIds: [],
      selectedKhuVucIds: [],
      khoiOptionCount: 0,
      khoaOptionCount: 0,
      ngheOptionCount: 0,
      khuOptionCount: 0,
    }),
  ]);

  const nkbv: FourPillarsBrief["nkbv"] = {
    available: false,
    choXn: null,
    tongPhieu: null,
    outcome_summary: null,
    clabsi_rate_per_1000: null,
    clabsi_sir: null,
  };
  if (nkbvSettled.status === "fulfilled" && nkbvSettled.value.success && nkbvSettled.value.data) {
    const k = nkbvSettled.value.data.kpis;
    nkbv.available = true;
    nkbv.choXn = k?.dang_va_cho_xn ?? 0;
    nkbv.tongPhieu = k?.tong_phieu ?? 0;
    const epi = summarizeNkbvOutcomeRates(
      (nkbvSettled.value.data.epidemiologyRates || []) as Array<Record<string, unknown>>,
    );
    nkbv.outcome_summary = epi.summary;
    nkbv.clabsi_rate_per_1000 = epi.clabsi_rate_per_1000;
    nkbv.clabsi_sir = epi.clabsi_sir;
  }

  const cssd: FourPillarsBrief["cssd"] = {
    available: false,
    san_luong_cap_phat: null,
    red_alert_total: null,
    frozen_total: null,
    may_ready: null,
    may_repairing: null,
    so_me_ky: null,
    ty_le_qc_dat_me: null,
    ownership_summary: null,
    destination_summary: null,
  };

  if (cssdAnalyticsSettled.status === "fulfilled" && cssdAnalyticsSettled.value.success) {
    const b = cssdAnalyticsSettled.value.data.brief;
    cssd.available = true;
    cssd.san_luong_cap_phat = b.san_luong_cap_phat;
    cssd.may_ready = b.may_ready;
    cssd.may_repairing = b.may_repairing;
    cssd.so_me_ky = b.so_me_ky;
    cssd.ty_le_qc_dat_me = b.ty_le_qc_dat_me;
    cssd.red_alert_total = b.red_alert_total;
    cssd.frozen_total = b.frozen_total;
    cssd.ownership_summary = describeCssdKhoaOwnershipProxy(
      cssdAnalyticsSettled.value.data.boByKhoa,
      2,
    ).summary;
    const dest = cssdAnalyticsSettled.value.data.capPhatByKhoaNhan;
    if (dest?.length) {
      cssd.destination_summary = describeCssdCapPhatByKhoaNhan(dest, 2).summary;
    }
  }

  if (cssdFlowSettled.status === "fulfilled" && cssdFlowSettled.value.success) {
    cssd.available = true;
    cssd.red_alert_total = cssdFlowSettled.value.cells.reduce((s, c) => s + c.redAlertCount, 0);
    cssd.frozen_total = cssdFlowSettled.value.cells.reduce((s, c) => s + c.frozenCount, 0);
  }

  const staff: FourPillarsBrief["staff"] = {
    available: false,
    so_nv: null,
    tong_phien_gs: null,
    tong_co_hoi_vst: null,
  };
  if (staffSettled.status === "fulfilled" && staffSettled.value.showKsnkStaffWorkload) {
    const rows = staffSettled.value.rows;
    staff.available = true;
    staff.so_nv = rows.length;
    staff.tong_phien_gs = rows.reduce((s, r) => s + r.so_phien_vst + r.so_phien_gsc, 0);
    staff.tong_co_hoi_vst = rows.reduce((s, r) => s + r.so_co_hoi_vst, 0);
  }

  return { cssd, nkbv, staff };
}
