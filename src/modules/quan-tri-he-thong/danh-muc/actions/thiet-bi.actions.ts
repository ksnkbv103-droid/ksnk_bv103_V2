"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "@/lib/master-data/engine/master-crud-core";
import type { ThietBiRow } from "./thiet-bi.types";
import { detectThietBiSensitiveChange } from "@/lib/domain/cssd-sensitive-change";
import { requireCssdSensitiveApprove } from "@/lib/master-data/require-cssd-sensitive-approve";

export async function getThietBiRowsAction() {
  await verifyPermission("THIET_BI", "view");
  const supabase = createAdminSupabaseClient();
  
  // Chạy song song tải thiết bị và mẻ tiệt khuẩn để đếm tần suất
  const [tbRes, loRes] = await Promise.all([
    supabase.from("v_cssd_thiet_bi_full").select("*").order("ma_thiet_bi"),
    supabase.from("cssd_fact_lo_tiet_khuan").select("thiet_bi_id").eq("is_active", true),
  ]);

  if (tbRes.error) return { success: false as const, error: tbRes.error.message };
  if (loRes.error) return { success: false as const, error: loRes.error.message };

  const countsMap = new Map<string, number>();
  if (loRes.data) {
    for (const row of loRes.data) {
      const tbId = row.thiet_bi_id;
      if (tbId) {
        countsMap.set(tbId, (countsMap.get(tbId) || 0) + 1);
      }
    }
  }

  const list = (tbRes.data || []) as ThietBiRow[];
  const mapped = list.map((item) => ({
    ...item,
    so_lan_su_dung: countsMap.get(item.id) || 0,
  }));

  return { success: true as const, data: mapped };
}

/** Danh sách loại máy tiệt khuẩn (khai báo) — dùng cho form thiết bị. */
export async function getLoaiMayTietKhuanOptionsAction() {
  await verifyPermission("THIET_BI", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "LOAI_MAY_TIET_KHUAN");
    return {
      success: true as const,
      data: rows.map((r) => ({ id: r.id, ma_loai_may: r.ma, ten_loai_may: r.ten })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

function parseDateOnly(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return todayYmdInVn(date);
}

export async function saveThietBiAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("THIET_BI", id ? "edit" : "create");
  const ma = String(input.ma_thiet_bi || "").trim().toUpperCase();
  const ten = String(input.ten_thiet_bi || "").trim();
  const namRaw = Number(input.nam_san_xuat);
  const nam = Number.isFinite(namRaw) ? Math.floor(namRaw) : null;
  const cycleRaw = Number(input.chu_ky_bao_tri_ngay);
  const cycle = Number.isFinite(cycleRaw) ? Math.max(1, Math.floor(cycleRaw)) : 180;

  if (!ma || !ten) {
    return { success: false as const, error: "Thiếu mã hoặc tên thiết bị." };
  }
  const trangThai = String(input.trang_thai || "").trim().toUpperCase();
  const lockedOps = trangThai === "REPAIRING" || trangThai === "BAO_TRI" || trangThai === "BROKEN";
  if (lockedOps && !id) {
    return {
      success: false as const,
      error: "Đang sửa / hỏng chỉ gán qua phiếu bảo trì trên màn Thiết bị CSSD.",
    };
  }

  const loaiMa = String(input.loai_thiet_bi || "").trim();
  let loai_may_id: string | null = null;
  if (loaiMa) {
    const supabase = createAdminSupabaseClient();
    const byMa = await supabase.from("cssd_dm_loai_may").select("id").eq("ma_loai_may", loaiMa).maybeSingle();
    if (byMa.data?.id) loai_may_id = String(byMa.data.id);
    else if (/^[0-9a-f-]{36}$/i.test(loaiMa)) loai_may_id = loaiMa;
  }

  const formSpecs = {
    hang_san_xuat: String(input.hang_san_xuat || "").trim() || null,
    nam_san_xuat: nam,
    serial_number: String(input.serial_number || "").trim() || null,
    model: String(input.model || "").trim() || null,
    vi_tri: String(input.vi_tri || "").trim() || null,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
  };

  /** ME-02/08: merge specs — không xóa bd_dau_ngay_* / chuong_trinh_catalog. */
  let specs: Record<string, unknown> = { ...formSpecs };
  if (id) {
    const supabase = createAdminSupabaseClient();
    const { data: cur } = await supabase.from("cssd_dm_thiet_bi").select("specs, trang_thai").eq("id", id).maybeSingle();
    const prev = (cur?.specs && typeof cur.specs === "object" ? cur.specs : {}) as Record<string, unknown>;
    specs = { ...prev, ...formSpecs };

    /** ME-03: không gỡ tay HOLD_QC / CHO_THAM_DINH ở danh mục. */
    const prevTt = String(cur?.trang_thai || "").trim().toUpperCase();
    const nextTt = trangThai || "READY";
    if (
      (prevTt === "HOLD_QC" || prevTt === "CHO_THAM_DINH") &&
      nextTt !== prevTt &&
      !lockedOps
    ) {
      return {
        success: false as const,
        error: "Tạm giữ / chờ thẩm định chỉ gỡ qua bảo trì và thẩm định — không đổi tay ở danh mục.",
      };
    }
    if (
      (nextTt === "HOLD_QC" || nextTt === "CHO_THAM_DINH") &&
      prevTt !== nextTt &&
      !lockedOps
    ) {
      return {
        success: false as const,
        error: "Không gán tạm giữ / chờ thẩm định tay ở danh mục — chỉ qua QC mẻ hoặc bảo trì.",
      };
    }
  }

  const payload = {
    ma_thiet_bi: ma,
    ten_thiet_bi: ten,
    loai_may_id,
    ...(lockedOps ? {} : { trang_thai: trangThai || "READY" }),
    ngay_dua_vao_su_dung: parseDateOnly(input.ngay_dua_vao_su_dung),
    chu_ky_bao_tri_ngay: cycle,
    specs,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  // AR-5d: thêm mới / ngừng hoạt động cần quyền approve; đổi tên, vị trí, ghi chú làm trực tiếp.
  let prevActive: { is_active?: boolean | null } | null = null;
  if (id) {
    const { data: cu } = await createAdminSupabaseClient()
      .from("cssd_dm_thiet_bi")
      .select("is_active")
      .eq("id", id)
      .maybeSingle();
    prevActive = (cu as { is_active?: boolean | null } | null) ?? null;
  }
  try {
    await requireCssdSensitiveApprove(
      "THIET_BI",
      detectThietBiSensitiveChange(id ? prevActive ?? { is_active: true } : null, { is_active: payload.is_active }),
    );
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }

  return upsertMasterRow("cssd_dm_thiet_bi", id, payload);
}

export async function toggleThietBiStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("THIET_BI", "edit");
  try {
    await requireCssdSensitiveApprove("THIET_BI", [currentStatus ? "ngừng hoạt động thiết bị" : "dùng lại thiết bị"]);
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }
  return toggleMasterStatus("cssd_dm_thiet_bi", id, currentStatus);
}

export async function softDeleteThietBiAction(id: string) {
  await verifyPermission("THIET_BI", "delete");
  try {
    await requireCssdSensitiveApprove("THIET_BI", ["xóa thiết bị"]);
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from("cssd_fact_lo_tiet_khuan")
    .select("id", { count: "exact", head: true })
    .eq("thiet_bi_id", id)
    .eq("is_active", true);
  if (!error && count && count > 0) {
    return {
      success: false as const,
      error: `Không thể xóa thiết bị đã phát sinh ${count} mẻ tiệt khuẩn. Hãy chuyển trạng thái sang ngưng hoạt động.`,
    };
  }
  return softDeleteMasterRow("cssd_dm_thiet_bi", id);
}

export async function softDeleteManyThietBiAction(ids: string[]) {
  await verifyPermission("THIET_BI", "delete");
  try {
    await requireCssdSensitiveApprove("THIET_BI", ["xóa thiết bị"]);
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không đủ quyền." };
  }
  if (!ids.length) return { success: false as const, error: "Chưa chọn dòng." };
  const supabase = createAdminSupabaseClient();
  const { data: activeBatches } = await supabase
    .from("cssd_fact_lo_tiet_khuan")
    .select("id, thiet_bi_id")
    .in("thiet_bi_id", ids)
    .eq("is_active", true);
  if (activeBatches && activeBatches.length > 0) {
    return {
      success: false as const,
      error: `Có ${activeBatches.length} mẻ tiệt khuẩn gắn với các thiết bị được chọn. Không thể xóa, hãy chuyển ngưng hoạt động.`,
    };
  }
  return softDeleteManyMasterRows("cssd_dm_thiet_bi", ids);
}
