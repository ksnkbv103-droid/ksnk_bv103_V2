"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import {
  type CatalogChangeDraftInput,
  type CatalogDoiTuong,
  type CatalogThaoTac,
  buildCatalogBeforeAfter,
  canApproveCatalogChange,
  canProposeCatalogChange,
  validateCatalogChangeDraft,
} from "@/lib/domain/cssd-catalog-change";
import {
  applyApprovedCatalogChange,
  loadCatalogChangeSnapshot,
} from "@/lib/master-data/cssd-catalog-change-apply-core";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

type Actor = { authId: string | null; email: string | null; roles: string[]; perms: { module: string; action: string }[] };

async function loadActor(): Promise<Actor> {
  const uc = await createServerSupabaseUserClient();
  const { data } = await uc.auth.getUser();
  const user = data.user;
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");
  if (isTrustedAdminEmail(user.email)) {
    return { authId: user.id, email: user.email || null, roles: ["ADMIN"], perms: [] };
  }
  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from("v_sys_user_permissions")
    .select("roles, permissions")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return {
    authId: user.id,
    email: user.email || null,
    roles: (row?.roles as string[]) || [],
    perms: (row?.permissions as { module: string; action: string }[]) || [],
  };
}

function revalidateCatalogSurfaces() {
  revalidatePath(quanTriDungCuHref());
  revalidatePath(quanTriDungCuHref("de-xuat"));
  revalidatePath("/cssd-dung-cu");
}

export async function proposeCatalogChangeAction(input: CatalogChangeDraftInput) {
  try {
    await verifyAnyPermission([
      { moduleKey: "CSSD_WORKFLOW", action: "edit" },
      { moduleKey: "CSSD_KHO_DUNGCU", action: "edit" },
    ]);
    const actor = await loadActor();
    if (!canProposeCatalogChange(actor.roles, actor.perms) && !actor.roles.includes("ADMIN")) {
      return { success: false as const, error: "Không đủ quyền đề xuất thay đổi danh mục." };
    }
    const err = validateCatalogChangeDraft(input);
    if (err) return { success: false as const, error: err };

    const supabase = createAdminSupabaseClient();
    const loaded = await loadCatalogChangeSnapshot(supabase, input);
    if (!loaded.ok) return { success: false as const, error: loaded.error };
    const preview = buildCatalogBeforeAfter(input, loaded.snap);

    const { error } = await supabase.from("cssd_fact_de_xuat_danh_muc").insert({
      loai_thao_tac: input.loaiThaoTac,
      doi_tuong: input.doiTuong,
      ly_do: String(input.lyDo).trim(),
      payload: input,
      snapshot_truoc: preview.truoc,
      snapshot_sau: preview.sau,
      bo_dung_cu_id: loaded.snap.bo?.id || null,
      bo_dung_cu_id_den: loaded.snap.boDen?.id || null,
      loai_dung_cu_id: input.loaiDungCuId || loaded.snap.loai?.id || loaded.snap.chiTiet?.loai_dung_cu_id || null,
      chi_tiet_id: input.chiTietId || loaded.snap.chiTiet?.id || null,
      so_luong: input.soLuong ?? null,
      nguoi_de_xuat_auth_id: actor.authId,
      nguoi_de_xuat_email: actor.email,
      trang_thai: "CHO_DUYET",
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    if (error) return { success: false as const, error: error.message };
    revalidateCatalogSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listCatalogChangeQueueAction(opts?: { trangThai?: string }) {
  try {
    await verifyAnyPermission([
      { moduleKey: "CSSD_WORKFLOW", action: "view" },
      { moduleKey: "CSSD_KHO_DUNGCU", action: "view" },
      { moduleKey: "LOAI_DC", action: "view" },
      { moduleKey: "BO_DC", action: "view" },
      { moduleKey: "DC_LE", action: "view" },
    ]);
    const supabase = createAdminSupabaseClient();
    let q = supabase
      .from("cssd_fact_de_xuat_danh_muc")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40);
    const st = String(opts?.trangThai || "CHO_DUYET").trim();
    if (st && st !== "ALL") q = q.eq("trang_thai", st);
    const { data, error } = await q;
    if (error) return { success: false as const, error: error.message, data: [] as unknown[] };
    return { success: true as const, data: data || [] };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e), data: [] as unknown[] };
  }
}

export async function reviewCatalogChangeAction(id: string, decision: "DA_DUYET" | "TU_CHOI", lyDoTuChoi?: string) {
  try {
    const actor = await loadActor();
    const supabase = createAdminSupabaseClient();
    const { data: row, error } = await supabase
      .from("cssd_fact_de_xuat_danh_muc")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    if (!row) return { success: false as const, error: "Không tìm thấy đề xuất." };
    if (String(row.trang_thai) !== "CHO_DUYET") {
      return { success: false as const, error: "Đề xuất đã được xử lý." };
    }

    const payload = (row.payload || {}) as CatalogChangeDraftInput;
    const doiTuong = String(row.doi_tuong) as CatalogDoiTuong;
    const thaoTac = String(row.loai_thao_tac) as CatalogThaoTac;
    if (!canApproveCatalogChange(actor.roles, actor.perms, doiTuong, thaoTac)) {
      return {
        success: false as const,
        error: "Không đủ quyền duyệt (cần ADMIN hoặc quyền Duyệt danh mục dụng cụ — tổ trưởng / chủ nhiệm).",
      };
    }

    if (decision === "TU_CHOI") {
      const { error: upErr } = await supabase
        .from("cssd_fact_de_xuat_danh_muc")
        .update({
          trang_thai: "TU_CHOI",
          ly_do_tu_choi: String(lyDoTuChoi || "").trim() || "Từ chối",
          nguoi_duyet_auth_id: actor.authId,
          nguoi_duyet_email: actor.email,
          duyet_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (upErr) return { success: false as const, error: upErr.message };
      revalidateCatalogSurfaces();
      return { success: true as const };
    }

    const applied = await applyApprovedCatalogChange(supabase, {
      ...payload,
      loaiThaoTac: thaoTac,
      doiTuong,
      lyDo: String(row.ly_do || payload.lyDo || ""),
    });
    if (!applied.success) return applied;

    const { error: upErr } = await supabase
      .from("cssd_fact_de_xuat_danh_muc")
      .update({
        trang_thai: "DA_DUYET",
        nguoi_duyet_auth_id: actor.authId,
        nguoi_duyet_email: actor.email,
        duyet_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (upErr) return { success: false as const, error: upErr.message };
    revalidateCatalogSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getCatalogChangeLookupsAction() {
  try {
    await verifyAnyPermission([
      { moduleKey: "CSSD_WORKFLOW", action: "view" },
      { moduleKey: "BO_DC", action: "view" },
      { moduleKey: "LOAI_DC", action: "view" },
    ]);
    const supabase = createAdminSupabaseClient();
    const [boRes, loaiRes] = await Promise.all([
      supabase
        .from("cssd_dm_bo_dung_cu")
        .select("id, ma_bo, ten_bo")
        .eq("is_active", true)
        .order("ma_bo")
        .limit(400),
      supabase
        .from("cssd_dm_loai_dung_cu")
        .select("id, ma_loai, ten_loai")
        .eq("is_active", true)
        .order("ma_loai")
        .limit(400),
    ]);
    if (boRes.error) return { success: false as const, error: boRes.error.message };
    if (loaiRes.error) return { success: false as const, error: loaiRes.error.message };
    return { success: true as const, boRows: boRes.data || [], loaiRows: loaiRes.data || [] };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
