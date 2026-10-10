/**
 * Áp tách nhiệt khi lưu loại Cao→Thấp (CSSD-04 Lock A).
 * Ưu tiên parent_bo_id / vai_tro_tach; fallback MAIN/SUB nếu cột chưa có (migration chưa apply).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCssdSubBoMa, normalizeBoMa } from "@/lib/domain/cssd-bo-ma";
import {
  isHeatSplitBlockedStation,
  planHeatSplitForBo,
  shouldAutoSplitOnLoaiHeatDowngrade,
  type HeatSplitBomLine,
} from "@/lib/domain/cssd-heat-split";

export type HeatSplitApplyResult = {
  split: { maBo: string; maSub: string; movedLines: number }[];
  skipped: { maBo: string; reason: string }[];
};

async function hasParentBoColumn(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.from("cssd_dm_bo_dung_cu").select("id, parent_bo_id").limit(1);
  return !error;
}

async function ensureComponentBo(
  supabase: SupabaseClient,
  parent: {
    id: string;
    ma_bo: string;
    ten_bo: string | null;
    khoa_su_dung_id: string | null;
    phan_loai_bo: string | null;
  },
  role: "CHIU_NHIET" | "KHONG_CHIU_NHIET",
  useParentCols: boolean,
): Promise<{ id: string; ma_bo: string }> {
  const suffix = role === "KHONG_CHIU_NHIET" ? "-KCN" : "-CN";
  const childMa =
    role === "KHONG_CHIU_NHIET" && !useParentCols
      ? buildCssdSubBoMa(parent.ma_bo)
      : `${normalizeBoMa(parent.ma_bo)}${suffix}`;
  const { data: existing, error: exErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, ma_bo")
    .eq("ma_bo", childMa)
    .eq("is_active", true)
    .maybeSingle();
  if (exErr) throw new Error(exErr.message);
  if (existing?.id) {
    return { id: String(existing.id), ma_bo: String(existing.ma_bo || childMa) };
  }

  const now = new Date().toISOString();
  const label = role === "KHONG_CHIU_NHIET" ? "không chịu nhiệt" : "chịu nhiệt";
  const row: Record<string, unknown> = {
    ma_bo: childMa,
    ten_bo: `${String(parent.ten_bo || parent.ma_bo).trim()} (${label})`,
    khoa_su_dung_id: parent.khoa_su_dung_id,
    phan_loai_bo: parent.phan_loai_bo || "PHAU_THUAT",
    trang_thai: "ACTIVE",
    co_ma_dinh_danh_rieng: true,
    is_active: true,
    ghi_chu: `Tách nhiệt danh mục · mẹ ${parent.ma_bo} · ${role}`,
    updated_at: now,
  };
  if (useParentCols) {
    row.parent_bo_id = parent.id;
    row.vai_tro_tach = role;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .insert(row)
    .select("id, ma_bo")
    .single();
  if (insErr) throw new Error(insErr.message);
  if (!inserted?.id) throw new Error(`Không tạo được bộ thành phần ${childMa}.`);
  return { id: String(inserted.id), ma_bo: String(inserted.ma_bo || childMa) };
}

async function ensureQuyTrinhForComponent(
  supabase: SupabaseClient,
  parentQuyTrinhId: string | null,
  childBoId: string,
  childMa: string,
  useParentCols: boolean,
): Promise<void> {
  const { data: hit, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("ma_qr_quy_trinh", childMa)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (hit?.id) return;

  const now = new Date().toISOString();
  let staPatch: Record<string, unknown> = {
    ma_trang_thai_hien_tai: "TIEP_NHAN",
    updated_at: now,
  };
  if (parentQuyTrinhId) {
    const { data: mainQt } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("ma_trang_thai_hien_tai")
      .eq("id", parentQuyTrinhId)
      .maybeSingle();
    const sta = String((mainQt as { ma_trang_thai_hien_tai?: string } | null)?.ma_trang_thai_hien_tai || "TIEP_NHAN");
    if (!isHeatSplitBlockedStation(sta)) {
      staPatch = { ma_trang_thai_hien_tai: sta, updated_at: now };
    }
  }

  const insertRow: Record<string, unknown> = {
    ma_qr_quy_trinh: childMa,
    ma_qr_bo_vinh_vien: childMa,
    bo_dung_cu_id: childBoId,
    ...staPatch,
    is_active: true,
    updated_at: now,
  };
  // Legacy fallback only when parent cols missing — không ghi MAIN/SUB khi Lock A.
  if (!useParentCols && parentQuyTrinhId) {
    insertRow.quy_trinh_cha_id = parentQuyTrinhId;
    insertRow.ma_vai_tro_bo = "SUB";
  }

  const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert(insertRow);
  if (insErr) throw new Error(insErr.message);
}

export async function applyHeatSplitAfterLoaiDowngrade(
  supabase: SupabaseClient,
  loaiId: string,
  prevIsChiuNhiet: boolean | null | undefined,
  nextIsChiuNhiet: boolean | null | undefined,
): Promise<HeatSplitApplyResult> {
  const out: HeatSplitApplyResult = { split: [], skipped: [] };
  if (!shouldAutoSplitOnLoaiHeatDowngrade(prevIsChiuNhiet, nextIsChiuNhiet)) {
    return out;
  }
  const id = String(loaiId || "").trim();
  if (!id) return out;

  const useParentCols = await hasParentBoColumn(supabase);

  const { data: bomRows, error: bomErr } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .select(
      "id, so_luong, ten_dung_cu_le, bo_dung_cu_id, loai_dung_cu_id, bo:cssd_dm_bo_dung_cu!bo_dung_cu_id(id, ma_bo, ten_bo, is_active, khoa_su_dung_id, phan_loai_bo)",
    )
    .eq("loai_dung_cu_id", id)
    .eq("is_active", true);
  if (bomErr) throw new Error(bomErr.message);

  const boIds = new Set<string>();
  for (const row of bomRows || []) {
    const rel = (row as { bo?: { id?: string; is_active?: boolean } | { id?: string; is_active?: boolean }[] | null }).bo;
    const bo = Array.isArray(rel) ? rel[0] : rel;
    if (bo?.id && bo.is_active !== false) boIds.add(String(bo.id));
  }
  if (boIds.size === 0) return out;

  for (const boId of boIds) {
    const { data: bo, error: boErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo, khoa_su_dung_id, phan_loai_bo")
      .eq("id", boId)
      .maybeSingle();
    if (boErr) throw new Error(boErr.message);
    if (!bo?.id) continue;
    const maBo = normalizeBoMa(String((bo as { ma_bo?: string }).ma_bo || ""));

    const { data: lineRows, error: lineErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select(
        "id, so_luong, ten_dung_cu_le, loai_dung_cu_id, loai:cssd_dm_loai_dung_cu!loai_dung_cu_id(is_chiu_nhiet)",
      )
      .eq("bo_dung_cu_id", boId)
      .eq("is_active", true);
    if (lineErr) throw new Error(lineErr.message);

    const lines: HeatSplitBomLine[] = (lineRows || []).map((r) => {
      const loaiRel = (r as { loai?: { is_chiu_nhiet?: boolean } | { is_chiu_nhiet?: boolean }[] | null }).loai;
      const loai = Array.isArray(loaiRel) ? loaiRel[0] : loaiRel;
      return {
        chiTietId: String((r as { id: string }).id),
        loaiId: String((r as { loai_dung_cu_id?: string }).loai_dung_cu_id || ""),
        isChiuNhiet: loai?.is_chiu_nhiet !== false,
        ten: String((r as { ten_dung_cu_le?: string }).ten_dung_cu_le || ""),
        soLuong: Number((r as { so_luong?: number }).so_luong || 0),
      };
    });

    const plan = planHeatSplitForBo(lines);
    if (!plan.needsSplit) continue;

    const { data: qtRows, error: qtErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id, ma_trang_thai_hien_tai, ma_vai_tro_bo")
      .eq("bo_dung_cu_id", boId)
      .eq("is_active", true);
    if (qtErr) throw new Error(qtErr.message);

    const blocked = (qtRows || []).filter((q) =>
      isHeatSplitBlockedStation(String((q as { ma_trang_thai_hien_tai?: string }).ma_trang_thai_hien_tai || "")),
    );
    if (blocked.length > 0) {
      out.skipped.push({
        maBo,
        reason: "Đang ở tiệt khuẩn / cấp phát — bỏ qua tách tự động.",
      });
      continue;
    }

    const parentQt =
      (qtRows || []).find((q) => String((q as { ma_vai_tro_bo?: string }).ma_vai_tro_bo || "").toUpperCase() !== "SUB") ||
      (qtRows || [])[0];
    const parentQtId = parentQt?.id ? String((parentQt as { id: string }).id) : null;

    const parentMeta = {
      id: boId,
      ma_bo: maBo,
      ten_bo: String((bo as { ten_bo?: string }).ten_bo || ""),
      khoa_su_dung_id: ((bo as { khoa_su_dung_id?: string | null }).khoa_su_dung_id as string | null) ?? null,
      phan_loai_bo: ((bo as { phan_loai_bo?: string | null }).phan_loai_bo as string | null) ?? null,
    };

    const coldChild = await ensureComponentBo(supabase, parentMeta, "KHONG_CHIU_NHIET", useParentCols);
    const now = new Date().toISOString();
    const { error: moveColdErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .update({ bo_dung_cu_id: coldChild.id, updated_at: now })
      .in("id", plan.subChiTietIds)
      .eq("bo_dung_cu_id", boId);
    if (moveColdErr) throw new Error(moveColdErr.message);

    if (useParentCols) {
      const heatChild = await ensureComponentBo(supabase, parentMeta, "CHIU_NHIET", true);
      if (plan.mainChiTietIds.length) {
        const { error: moveHeatErr } = await supabase
          .from("cssd_dm_bo_dung_cu_chi_tiet")
          .update({ bo_dung_cu_id: heatChild.id, updated_at: now })
          .in("id", plan.mainChiTietIds)
          .eq("bo_dung_cu_id", boId);
        if (moveHeatErr) throw new Error(moveHeatErr.message);
      }
      await ensureQuyTrinhForComponent(supabase, parentQtId, heatChild.id, heatChild.ma_bo, true);
      await ensureQuyTrinhForComponent(supabase, parentQtId, coldChild.id, coldChild.ma_bo, true);
      out.split.push({
        maBo,
        maSub: `${heatChild.ma_bo}+${coldChild.ma_bo}`,
        movedLines: plan.subChiTietIds.length + plan.mainChiTietIds.length,
      });
    } else {
      if (parentQtId) {
        await supabase
          .from("cssd_fact_quy_trinh")
          .update({ ma_vai_tro_bo: "MAIN", updated_at: now })
          .eq("id", parentQtId);
      }
      await ensureQuyTrinhForComponent(supabase, parentQtId, coldChild.id, coldChild.ma_bo, false);
      out.split.push({
        maBo,
        maSub: coldChild.ma_bo,
        movedLines: plan.subChiTietIds.length,
      });
    }
  }

  return out;
}

export function formatHeatSplitToast(result: HeatSplitApplyResult): string | null {
  if (result.split.length === 0 && result.skipped.length === 0) return null;
  const parts: string[] = [];
  if (result.split.length) {
    parts.push(
      `Đã tách ${result.split.length} bộ: ${result.split
        .map((s) => `${s.maBo} → ${s.maSub} (${s.movedLines} dòng không chịu nhiệt/thành phần)`)
        .join("; ")}.`,
    );
  }
  if (result.skipped.length) {
    parts.push(
      `Bỏ qua ${result.skipped.length} bộ: ${result.skipped.map((s) => `${s.maBo} (${s.reason})`).join("; ")}.`,
    );
  }
  return parts.join(" ");
}
