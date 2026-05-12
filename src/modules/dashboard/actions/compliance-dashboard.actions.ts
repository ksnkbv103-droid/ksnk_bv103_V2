"use server";

import { format, parseISO } from "date-fns";
import { bv103DefaultTuNgayFromDenIso } from "@/lib/bv103-analytics-default-range";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission, verifyPermissions } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { getCachedDmKhoaPhong, getCachedDmNgheNghiep, getCachedDmKhuVucGiamSat, getCachedDmKhoiKhoa } from "@/lib/cache/master-data-cache";
import {
  complianceDashboardFiltersSchema,
  type ParsedComplianceDashboardFilters,
} from "@/lib/validations/dashboard-compliance.filters";
import {
  type ComplianceDashboardPayload,
  type ComplianceDashboardGroupRow as GroupRow,
  type ComplianceDashboardViolationRow as ViolationRow,
  buildEmptyComplianceDashboardPayload,
} from "../compliance-dashboard.types";
import type {
  ComplianceDashboardFilters,
  DashboardSummaryRow,
  DashboardSummaryTableFilters,
} from "../compliance-dashboard.types";

const dashboardSummaryTableFiltersSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "tu_ngay YYYY-MM-DD"),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "den_ngay YYYY-MM-DD"),
  khoi_ids: z.array(z.string().min(1)).optional(),
  khoa_ids: z.array(z.string().min(1)).optional(),
});

export async function getDashboardSummaryTable(filters: DashboardSummaryTableFilters) {
  const parsed = dashboardSummaryTableFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") || "Tham số không hợp lệ" };
  }
  const f = parsed.data;
  const supabase = await createServerSupabaseUserClient();
  await verifyComplianceDashboardAccess();

  const scope = await getActorKsnkScope();
  const isNetwork = scope.isMangLuoiKsnk;
  const p_khoi_ids = isNetwork ? null : f.khoi_ids && f.khoi_ids.length > 0 ? f.khoi_ids : null;
  const p_khoa_ids = isNetwork ? (scope.actorKhoaId ? [scope.actorKhoaId] : null) : f.khoa_ids && f.khoa_ids.length > 0 ? f.khoa_ids : null;

  const { data, error } = await supabase.rpc("rpc_get_dashboard_summary_table", {
    p_tu_ngay: f.tu_ngay,
    p_den_ngay: f.den_ngay,
    p_khoi_ids,
    p_khoa_ids,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as DashboardSummaryRow[] };
}

/** Dashboard tuân thủ: cần quyền xem DASHBOARD + ít nhất một nguồn giám sát (GSC hoặc VST) để khớp dữ liệu hiển thị. */
async function verifyComplianceDashboardAccess() {
  await verifyPermissions([{ moduleKey: "DASHBOARD", action: "view" }]);
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
    { moduleKey: "GIAM_SAT_VST", action: "view" },
  ]);
}

async function loadComplianceFilterOptionsData(supabase: SupabaseClient) {
  const [bkRes, khoiData, khoaData, ngheData, khuData] = await Promise.all([
    supabase.from("dm_bang_kiem").select("id, ma_bk, ten_bang_kiem, is_active").order("ma_bk", { ascending: true }),
    getCachedDmKhoiKhoa(),
    getCachedDmKhoaPhong(),
    getCachedDmNgheNghiep(),
    getCachedDmKhuVucGiamSat(),
  ]);

  if (bkRes.error) return { success: false as const, error: bkRes.error.message };

  return {
    success: true as const,
    data: {
      bang_kiem: [
        { id: "VST_WHO", label: "Vệ sinh tay (WHO)" },
        ...(bkRes.data || []).map((x) => {
          const ma = String(x.ma_bk || "").trim();
          const ten = String(x.ten_bang_kiem || x.ma_bk || "").trim() || "Bảng kiểm";
          const activeTag = x.is_active === false ? " (ngưng dùng)" : "";
          return { id: ma || `BK_ID:${String(x.id || "")}`, label: `${ten}${activeTag}` };
        }),
      ],
      khoi: khoiData.map((x) => ({ id: String(x.id), label: String(x.ten_khoi || "—") })),
      khoa: khoaData.map((x) => ({ id: String(x.id), label: String(x.ten_khoa || "—"), khoi_id: String(x.khoi_id || "") })),
      nghe_nghiep: ngheData.map((x) => ({ id: String(x.id), label: String(x.ten_nghe_nghiep || "—") })),
      khu_vuc: khuData.map((x) => ({ id: String(x.id), label: String(x.ten_khu_vuc || "—") })),
    },
  };
}

export async function getComplianceFilterOptions() {
  const supabase = await createServerSupabaseUserClient();
  await verifyComplianceDashboardAccess();
  return loadComplianceFilterOptionsData(supabase);
}

export async function getComplianceDashboardPayloads(filters: ComplianceDashboardFilters = {}) {
  const parsed = complianceDashboardFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Bộ lọc không hợp lệ",
    };
  }
  const f: ParsedComplianceDashboardFilters = parsed.data;

  const supabase = await createServerSupabaseUserClient();
  await verifyComplianceDashboardAccess();
  const scope = await getActorKsnkScope();
  const isNetwork = scope.isMangLuoiKsnk;
  const p_khoi_ids = isNetwork ? null : (f.khoi_ids ?? []).length > 0 ? f.khoi_ids ?? null : null;
  const p_khoa_ids = isNetwork
    ? scope.actorKhoaId
      ? [scope.actorKhoaId]
      : null
    : (f.khoa_ids ?? []).length > 0
      ? f.khoa_ids ?? null
      : null;
  const p_nghe_nghiep_ids = isNetwork ? null : (f.nghe_nghiep_ids ?? []).length > 0 ? f.nghe_nghiep_ids ?? null : null;
  const p_khu_vuc_ids = isNetwork ? null : (f.khu_vuc_ids ?? []).length > 0 ? f.khu_vuc_ids ?? null : null;

  const denStr = f.den_ngay?.trim() || format(new Date(), "yyyy-MM-dd");
  const tuStr = f.tu_ngay?.trim() || bv103DefaultTuNgayFromDenIso(denStr);

  const bksAll = (f.bang_kiem_mas ?? []).map((x) => String(x || "").trim()).filter(Boolean);
  const gscSelectionKeys = bksAll.filter((x) => x !== "VST_WHO");

  const rpcKeyBySelection = new Map<string, string>();
  const rpcKeys = new Set<string>();
  const bkIdPrefix = "BK_ID:";
  const prefixedKeys = gscSelectionKeys.filter((k) => k.startsWith(bkIdPrefix));
  const plainKeys = gscSelectionKeys.filter((k) => !k.startsWith(bkIdPrefix));

  for (const k of plainKeys) {
    rpcKeyBySelection.set(k, k);
    rpcKeys.add(k);
  }

  if (prefixedKeys.length > 0) {
    const ids = Array.from(
      new Set(
        prefixedKeys
          .map((k) => k.slice(bkIdPrefix.length).trim())
          .filter((id) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
          ),
      ),
    );
    const byId = new Map<string, { ma_bk: string }>();
    if (ids.length > 0) {
      const { data: dmRows, error: dmErr } = await supabase.from("dm_bang_kiem").select("id, ma_bk").in("id", ids);
      if (dmErr) return { success: false as const, error: dmErr.message };
      for (const r of dmRows || []) {
        byId.set(String(r.id), { ma_bk: String(r.ma_bk ?? "").trim() });
      }
    }
    for (const k of prefixedKeys) {
      const rawId = k.slice(bkIdPrefix.length).trim();
      const ma = byId.get(rawId)?.ma_bk ?? "";
      const rpc = ma || rawId;
      rpcKeyBySelection.set(k, rpc);
      rpcKeys.add(rpc);
    }
  }

  const gscBks = [...rpcKeys];

  const { data: rpcData, error: rpcErr } = await supabase.rpc("rpc_get_compliance_dashboard_multi_v1", {
    p_tu_ngay: tuStr,
    p_den_ngay: denStr,
    p_bang_kiem_mas: gscBks.length > 0 ? gscBks : null,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_supervision_type: f.supervision_type || 'ALL'
  });

  if (rpcErr) return { success: false as const, error: rpcErr.message };

  const result: Record<string, ComplianceDashboardPayload> = {};
  Object.entries(rpcData as object).forEach(([bk, d]) => {
    const row = d as {
      summary?: ComplianceDashboardPayload["summary"];
      by_khoa?: GroupRow[];
      by_nghe_nghiep?: GroupRow[];
      by_khu_vuc?: GroupRow[];
      trend?: ComplianceDashboardPayload["trend"];
      violations?: ViolationRow[];
      supervision_sources?: ComplianceDashboardPayload["supervision_sources"];
      participation?: ComplianceDashboardPayload["participation"];
    };
    result[bk] = {
      tu_ngay: tuStr,
      den_ngay: denStr,
      options: { bang_kiem: [], khoi: [], khoa: [], nghe_nghiep: [], khu_vuc: [] },
      summary: row.summary ?? { tong_phien: 0, tong_quan_sat: 0, tong_vi_pham: 0, ty_le_tuan_thu: 0 },
      by_khoa: row.by_khoa || [],
      by_nghe_nghiep: row.by_nghe_nghiep || [],
      by_khu_vuc: row.by_khu_vuc || [],
      trend: row.trend || [],
      top5_khoa: (row.by_khoa || []).slice(0, 5),
      bottom5_khoa: (row.by_khoa || []).slice(-5).reverse(),
      rank_khoa: (row.by_khoa || []).map((x, i, arr) => ({
        ...x,
        stt: i + 1,
        nhom_mau: i < 5 ? "GREEN" : i >= arr.length - 5 ? "RED" : "BLUE",
      })),
      violations: row.violations || [],
      supervision_sources: row.supervision_sources || [],
      participation: row.participation || [],
    };
  });

  for (const [sel, rpc] of rpcKeyBySelection) {
    if (sel !== rpc && result[rpc]) result[sel] = result[rpc];
  }

  for (const ma of gscSelectionKeys) {
    if (!result[ma]) result[ma] = buildEmptyComplianceDashboardPayload(tuStr, denStr);
  }

  return { success: true as const, data: result };
}
