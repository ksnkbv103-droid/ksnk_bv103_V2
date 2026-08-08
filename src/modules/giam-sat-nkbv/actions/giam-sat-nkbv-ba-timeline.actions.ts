"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission, verifyPermission } from "@/lib/server-permission";
import { normalizeBaTimelineDbId } from "../lib/nkbv-ba-timeline-id";

/** Client hub đã patch/reload — không revalidatePath mỗi tick (gây lag RSC). */

const KINDS = new Set(["IMAGING_CHEST", "LAB_OTHER", "SYMPTOM", "PROCEDURE_SURGERY", "NOTE"]);

export async function listNkbvBaTimelineManual(maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const ma = String(maBenhAn || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án", data: [] as const };

  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("nkbv_fact_ba_timeline")
    .select(
      "id, ma_benh_an, milestone_kind, milestone_date, title, detail, specimen_hint, criteria_key, is_active",
    )
    .eq("ma_benh_an", ma)
    .eq("is_active", true)
    .order("milestone_date", { ascending: true })
    .limit(200);
  if (error) return { success: false as const, error: error.message, data: [] as const };
  return { success: true as const, data: data || [] };
}

export async function upsertNkbvBaTimelineMilestone(payload: {
  id?: string;
  ma_benh_an: string;
  milestone_kind: string;
  milestone_date: string;
  title: string;
  detail?: string | null;
  specimen_hint?: string | null;
  /** Khóa tiêu chuẩn CDC — bắt buộc khi thêm yếu tố chẩn đoán lên timeline. */
  criteria_key?: string | null;
}) {
  // Thêm / sửa yếu tố trên BA: đủ create hoặc edit — 1 lần check, không double auth round-trip
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "create" },
    { moduleKey: "GIAM_SAT_NKBV", action: "edit" },
  ]);
  const ma = String(payload.ma_benh_an || "").trim();
  const kind = String(payload.milestone_kind || "").trim();
  const date = String(payload.milestone_date || "").slice(0, 10);
  const title = String(payload.title || "").trim();
  const criteriaKey = payload.criteria_key ? String(payload.criteria_key).trim() : null;
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };
  if (!KINDS.has(kind)) return { success: false as const, error: "Loại mốc không hợp lệ" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false as const, error: "Ngày mốc không hợp lệ" };
  if (!title) return { success: false as const, error: "Thiếu tiêu đề mốc" };
  // NOTE = ghi chú; SYMPTOM không criteria_key = triệu chứng lâm sàng tự do trên lưới CDC
  if (!criteriaKey && kind !== "NOTE" && kind !== "SYMPTOM") {
    return {
      success: false as const,
      error: "Chọn yếu tố tiêu chuẩn CDC (XQ / triệu chứng chẩn đoán / ngày mổ…) — không thêm ghi chú trống",
    };
  }

  const supabase = createAdminSupabaseClient();
  const row = {
    ma_benh_an: ma,
    milestone_kind: kind,
    milestone_date: date,
    title,
    detail: payload.detail ? String(payload.detail).trim() : null,
    specimen_hint: payload.specimen_hint ? String(payload.specimen_hint).trim() : null,
    criteria_key: criteriaKey,
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  const dbId = normalizeBaTimelineDbId(payload.id);
  if (payload.id && !dbId) {
    return { success: false as const, error: "Không sửa được mốc LIS/device — chỉ mốc thủ công trên BA" };
  }

  if (dbId) {
    const { data, error } = await supabase
      .from("nkbv_fact_ba_timeline")
      .update(row)
      .eq("id", dbId)
      .select()
      .single();
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data };
  }

  // True upsert theo khóa nghiệp vụ: ưu tiên kích hoạt lại / cập nhật bản cùng
  // (BA, ngày, criteria_key) — tránh insert chồng khi unique index chưa apply hoặc bản inactive.
  if (criteriaKey) {
    const { data: sameKey } = await supabase
      .from("nkbv_fact_ba_timeline")
      .select("id, is_active")
      .eq("ma_benh_an", ma)
      .eq("milestone_date", date)
      .eq("criteria_key", criteriaKey)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sameKey?.id) {
      const { data: updated, error: updErr } = await supabase
        .from("nkbv_fact_ba_timeline")
        .update(row)
        .eq("id", sameKey.id)
        .select()
        .single();
      if (updErr) return { success: false as const, error: updErr.message };
      // Soft-delete mọi bản active khác cùng khóa (dữ liệu cũ trước unique index).
      await supabase
        .from("nkbv_fact_ba_timeline")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("ma_benh_an", ma)
        .eq("milestone_date", date)
        .eq("criteria_key", criteriaKey)
        .eq("is_active", true)
        .neq("id", sameKey.id);
      return { success: true as const, data: updated };
    }
  }

  // Insert-first: unique index (BA, ngày, criteria_key) chống lặp tận gốc.
  // Đụng bản active cùng khóa → 23505 → update bản đó (idempotent khi bấm + nhiều lần).
  const { data, error } = await supabase.from("nkbv_fact_ba_timeline").insert(row).select().single();
  if (!error) return { success: true as const, data };
  if (error.code === "23505" && criteriaKey) {
    const { data: dup } = await supabase
      .from("nkbv_fact_ba_timeline")
      .select("id")
      .eq("ma_benh_an", ma)
      .eq("milestone_date", date)
      .eq("criteria_key", criteriaKey)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (dup?.id) {
      const { data: updated, error: updErr } = await supabase
        .from("nkbv_fact_ba_timeline")
        .update(row)
        .eq("id", dup.id)
        .select()
        .single();
      if (updErr) return { success: false as const, error: updErr.message };
      return { success: true as const, data: updated };
    }
  }
  return { success: false as const, error: error.message };
}

export async function softDeleteNkbvBaTimelineMilestone(id: string) {
  // Xóa mềm yếu tố timeline = chỉnh sửa hồ sơ BA — đủ edit hoặc delete, 1 lần check
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "edit" },
    { moduleKey: "GIAM_SAT_NKBV", action: "delete" },
  ]);
  const dbId = normalizeBaTimelineDbId(id);
  if (!dbId) return { success: false as const, error: "Không xóa được mốc này (LIS/device/local)" };
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("nkbv_fact_ba_timeline")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", dbId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

/**
 * Xóa mềm TẤT CẢ mốc active cùng khóa (BA + ngày + criteria_key).
 * Dùng khi untick CĐHA/TC — tránh chip “hiện lại” vì còn bản trùng cũ.
 */
export async function softDeleteNkbvBaTimelineByKey(payload: {
  ma_benh_an: string;
  milestone_date: string;
  criteria_key: string;
}) {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "edit" },
    { moduleKey: "GIAM_SAT_NKBV", action: "delete" },
  ]);
  const ma = String(payload.ma_benh_an || "").trim();
  const date = String(payload.milestone_date || "").slice(0, 10);
  const criteriaKey = String(payload.criteria_key || "").trim();
  if (!ma || !criteriaKey || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false as const, error: "Thiếu khóa xóa mốc timeline" };
  }
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("nkbv_fact_ba_timeline")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("ma_benh_an", ma)
    .eq("milestone_date", date)
    .eq("criteria_key", criteriaKey)
    .eq("is_active", true);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

/**
 * Đồng bộ form → timeline: 1 mốc form_sync theo (BA + criteria_key).
 * date rỗng → soft-delete mốc sync tương ứng.
 */
export async function syncFormSymptomToBaTimeline(payload: {
  ma_benh_an: string;
  criteria_key: string;
  milestone_kind: string;
  title: string;
  milestone_date: string | null;
  form_field_key: string;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const ma = String(payload.ma_benh_an || "").trim();
  const criteriaKey = String(payload.criteria_key || "").trim();
  const formKey = String(payload.form_field_key || "").trim();
  if (!ma || !criteriaKey || !formKey) {
    return { success: false as const, error: "Thiếu khóa đồng bộ timeline" };
  }

  const supabase = createAdminSupabaseClient();
  const detailTag = `form_sync:${formKey}`;
  const { data: existing } = await supabase
    .from("nkbv_fact_ba_timeline")
    .select("id")
    .eq("ma_benh_an", ma)
    .eq("criteria_key", criteriaKey)
    .eq("is_active", true)
    .eq("detail", detailTag)
    .limit(1)
    .maybeSingle();

  const date = payload.milestone_date ? String(payload.milestone_date).slice(0, 10) : "";
  if (!date) {
    if (existing?.id) {
      const { error } = await supabase
        .from("nkbv_fact_ba_timeline")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return { success: false as const, error: error.message };
    }
    return { success: true as const };
  }

  return upsertNkbvBaTimelineMilestone({
    id: existing?.id ? String(existing.id) : undefined,
    ma_benh_an: ma,
    milestone_kind: payload.milestone_kind,
    milestone_date: date,
    title: payload.title,
    detail: detailTag,
    criteria_key: criteriaKey,
  });
}
