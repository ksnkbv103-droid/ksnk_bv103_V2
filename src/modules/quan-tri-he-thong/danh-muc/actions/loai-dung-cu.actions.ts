"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission, verifyPermission } from "@/lib/server-permission";
import { requireCssdCatalogMasterWrite } from "@/lib/master-data/require-cssd-catalog-master-write";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import {
  applyResolvedTramToLoaiSpecs,
  buildLoaiPhysicalUpsertPayload,
  missingTramCssdSeedMessage,
  resolveSuggestedTramFromCatalog,
  suggestCssdStationFromMaster,
} from "@/lib/master-data/cssd-loai-dung-cu-map";
import { loaiListSortColumn, mapLoaiPhysicalToListRow, mergeLoaiListTrongBo } from "@/lib/master-data/cssd-loai-list-map";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import type { FactListPaginationInput } from "@/lib/validations/fact-list-pagination";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";

type LoaiDungCuPayload = Record<string, unknown>;

const LOAI_LIST_SELECT =
  "id, ma_loai, ten_loai, specs, is_active, is_chiu_nhiet, phan_loai_spaulding, phuong_phap_tiet_khuan_chi_dinh, phan_loai, so_luong_kho_du_phong";

export async function getLoaiDungCuRowsAction(params?: Partial<FactListPaginationInput>) {
  await verifyPermission("LOAI_DC", "view");
  const supabase = createAdminSupabaseClient();
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params?.pageSize) || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sortCol = loaiListSortColumn(String(params?.sortKey || "ma_loai"));
  const ascending = (params?.sortDir || "asc") !== "desc";
  let query = supabase
    .from("cssd_dm_loai_dung_cu")
    .select(LOAI_LIST_SELECT, { count: "exact" });
  const filter = buildSupabaseSearchFilter(params?.search, ["ma_loai", "ten_loai"]);
  if (filter) query = query.or(filter);
  const { data, error, count } = await query
    .order("is_active", { ascending: false })
    .order(sortCol, { ascending })
    .range(from, to);
  if (error) return { success: false as const, error: error.message, data: [], totalCount: 0 };
  const mapped = (data || []).map((r) => mapLoaiPhysicalToListRow(r as Record<string, unknown>));
  const ids = mapped.map((r) => r.id).filter(Boolean);
  const trongBoByLoaiId = new Map<string, number>();
  if (ids.length) {
    const { data: setRows, error: setErr } = await supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select("loai_dung_cu_id, so_luong_thuc_te")
      .in("loai_dung_cu_id", ids)
      .eq("is_active", true);
    if (setErr) return { success: false as const, error: setErr.message, data: [], totalCount: 0 };
    for (const row of setRows || []) {
      const id = String((row as { loai_dung_cu_id?: string }).loai_dung_cu_id || "");
      if (!id) continue;
      trongBoByLoaiId.set(
        id,
        (trongBoByLoaiId.get(id) || 0) + Number((row as { so_luong_thuc_te?: number }).so_luong_thuc_te || 0),
      );
    }
  }
  return {
    success: true as const,
    data: mergeLoaiListTrongBo(mapped, trongBoByLoaiId),
    totalCount: count ?? 0,
  };
}

export async function searchLoaiDungCuOptionsAction(q: string, limit = 20) {
  await verifyAnyPermission([
    { moduleKey: "LOAI_DC", action: "view" },
    { moduleKey: "BO_DC", action: "view" },
    { moduleKey: "DC_LE", action: "view" },
    { moduleKey: "CSSD_KHO_DUNGCU", action: "view" },
    { moduleKey: "CSSD_WORKFLOW", action: "view" },
  ]);
  const supabase = createAdminSupabaseClient();
  const take = Math.min(50, Math.max(1, limit));
  let query = supabase
    .from("cssd_dm_loai_dung_cu")
    .select("id, ma_loai, ten_loai, specs")
    .eq("is_active", true);
  const filter = buildSupabaseSearchFilter(q, ["ma_loai", "ten_loai"]);
  if (filter) query = query.or(filter);
  const { data, error } = await query.order("ma_loai", { ascending: true }).limit(take);
  if (error) return { success: false as const, error: error.message, data: [] };
  return {
    success: true as const,
    data: (data || []).map((r) => {
      const mapped = mapLoaiPhysicalToListRow(r as Record<string, unknown>);
      return { id: mapped.id, ma_danh_muc: mapped.ma_danh_muc, ten_danh_muc: mapped.ten_danh_muc };
    }),
  };
}

export async function getLoaiDungCuContainingBosAction(loaiId: string) {
  await verifyPermission("LOAI_DC", "view");
  const id = String(loaiId || "").trim();
  if (!id) return { success: true as const, data: [] as { id: string; ma_bo: string | null; ten_bo: string | null }[] };
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .select("so_luong, bo:cssd_dm_bo_dung_cu!bo_dung_cu_id(id, ma_bo, ten_bo, is_active)")
    .eq("loai_dung_cu_id", id)
    .eq("is_active", true);
  if (error) return { success: false as const, error: error.message, data: [] };
  const byId = new Map<string, { id: string; ma_bo: string | null; ten_bo: string | null }>();
  for (const row of data || []) {
    const rel = (row as { bo?: { id?: string; ma_bo?: string; ten_bo?: string; is_active?: boolean } | { id?: string; ma_bo?: string; ten_bo?: string; is_active?: boolean }[] | null }).bo;
    const bo = Array.isArray(rel) ? rel[0] : rel;
    if (!bo?.id || bo.is_active === false) continue;
    byId.set(bo.id, { id: bo.id, ma_bo: bo.ma_bo ?? null, ten_bo: bo.ten_bo ?? null });
  }
  return { success: true as const, data: [...byId.values()] };
}

export async function listActiveTramCssdForLoaiAction() {
  await verifyPermission("LOAI_DC", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const data = await fetchActiveRegistryDmRows(supabase, "TRAM_CSSD");
    return { success: true as const, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function saveLoaiDungCuAction(input: LoaiDungCuPayload) {
  const id = String(input.id || "").trim();
  await verifyPermission("LOAI_DC", id ? "edit" : "create");
  await requireCssdCatalogMasterWrite();
  const payload = buildLoaiPhysicalUpsertPayload(input);
  const ma = String(payload.ma_loai || "");
  const ten = String(payload.ten_loai || "");
  if (!ma || !ten) {
    return { success: false, error: "Thiếu mã hoặc tên loại dụng cụ." };
  }
  const suggestion = suggestCssdStationFromMaster({
    spaulding: payload.phan_loai_spaulding,
    sterileMethod: payload.phuong_phap_tiet_khuan_chi_dinh,
    isChiuNhiet: payload.is_chiu_nhiet,
  });
  const supabase = createAdminSupabaseClient();
  let tramWarning: string | undefined;
  try {
    const trams = await fetchActiveRegistryDmRows(supabase, "TRAM_CSSD");
    const resolved = resolveSuggestedTramFromCatalog(suggestion.maTramGoiY, trams);
    const specs =
      payload.specs && typeof payload.specs === "object" && !Array.isArray(payload.specs)
        ? (payload.specs as Record<string, unknown>)
        : {};
    payload.specs = applyResolvedTramToLoaiSpecs(specs, resolved, suggestion.maTramGoiY);
    if (!resolved) tramWarning = missingTramCssdSeedMessage(suggestion.maTramGoiY);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Không đọc được danh mục trạm CSSD: ${msg}` };
  }
  const saved = await upsertMasterRow("cssd_dm_loai_dung_cu", id, payload);
  if (!saved.success) return saved;
  return { ...saved, warning: tramWarning };
}

export async function toggleLoaiDungCuStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("LOAI_DC", "edit");
  await requireCssdCatalogMasterWrite();
  return toggleMasterStatus("cssd_dm_loai_dung_cu", id, currentStatus);
}

export async function softDeleteLoaiDungCuAction(id: string) {
  await verifyPermission("LOAI_DC", "delete");
  await requireCssdCatalogMasterWrite();
  return softDeleteMasterRow("cssd_dm_loai_dung_cu", id);
}

export async function softDeleteManyLoaiDungCuAction(ids: string[]) {
  await verifyPermission("LOAI_DC", "delete");
  await requireCssdCatalogMasterWrite();
  return softDeleteManyMasterRows("cssd_dm_loai_dung_cu", ids);
}
