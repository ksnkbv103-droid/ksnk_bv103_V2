/**
 * Áp tách MAIN/SUB khi lưu loại dụng cụ Cao→Thấp (CSSD-A).
 * Không đụng bộ đang TIET_KHUAN / CAP_PHAT.
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

async function ensureSubBo(
  supabase: SupabaseClient,
  main: { id: string; ma_bo: string; ten_bo: string | null; khoa_su_dung_id: string | null; phan_loai_bo: string | null },
): Promise<{ id: string; ma_bo: string }> {
  const subMa = buildCssdSubBoMa(main.ma_bo);
  const { data: existing, error: exErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("id, ma_bo")
    .eq("ma_bo", subMa)
    .eq("is_active", true)
    .maybeSingle();
  if (exErr) throw new Error(exErr.message);
  if (existing?.id) {
    return { id: String(existing.id), ma_bo: String(existing.ma_bo || subMa) };
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .insert({
      ma_bo: subMa,
      ten_bo: `${String(main.ten_bo || main.ma_bo).trim()} (nhạy nhiệt)`,
      khoa_su_dung_id: main.khoa_su_dung_id,
      phan_loai_bo: main.phan_loai_bo || "PHAU_THUAT",
      trang_thai: "ACTIVE",
      co_ma_dinh_danh_rieng: true,
      is_active: true,
      ghi_chu: `Tự tách khi danh mục loại đổi sang nhạy nhiệt · MAIN ${main.ma_bo}`,
      updated_at: now,
    })
    .select("id, ma_bo")
    .single();
  if (insErr) throw new Error(insErr.message);
  if (!inserted?.id) throw new Error(`Không tạo được bộ SUB ${subMa}.`);
  return { id: String(inserted.id), ma_bo: String(inserted.ma_bo || subMa) };
}

async function ensureQuyTrinhSub(
  supabase: SupabaseClient,
  mainQuyTrinhId: string | null,
  subBoId: string,
  subMa: string,
): Promise<void> {
  const { data: hit, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id")
    .eq("ma_qr_quy_trinh", subMa)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (hit?.id) return;

  const now = new Date().toISOString();
  let staPatch: Record<string, unknown> = {
    ma_trang_thai_hien_tai: "DONG_GOI",
    updated_at: now,
  };
  if (mainQuyTrinhId) {
    const { data: mainQt } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("ma_trang_thai_hien_tai")
      .eq("id", mainQuyTrinhId)
      .maybeSingle();
    const sta = String((mainQt as { ma_trang_thai_hien_tai?: string } | null)?.ma_trang_thai_hien_tai || "DONG_GOI");
    if (!isHeatSplitBlockedStation(sta)) {
      staPatch = { ma_trang_thai_hien_tai: sta, updated_at: now };
    }
  }

  const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert({
    ma_qr_quy_trinh: subMa,
    ma_qr_bo_vinh_vien: subMa,
    bo_dung_cu_id: subBoId,
    ...staPatch,
    quy_trinh_cha_id: mainQuyTrinhId,
    ma_vai_tro_bo: "SUB",
    is_active: true,
    updated_at: now,
  });
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

    const mainQt =
      (qtRows || []).find((q) => String((q as { ma_vai_tro_bo?: string }).ma_vai_tro_bo || "").toUpperCase() !== "SUB") ||
      (qtRows || [])[0];
    const mainQtId = mainQt?.id ? String((mainQt as { id: string }).id) : null;

    const sub = await ensureSubBo(supabase, {
      id: boId,
      ma_bo: maBo,
      ten_bo: String((bo as { ten_bo?: string }).ten_bo || ""),
      khoa_su_dung_id: ((bo as { khoa_su_dung_id?: string | null }).khoa_su_dung_id as string | null) ?? null,
      phan_loai_bo: ((bo as { phan_loai_bo?: string | null }).phan_loai_bo as string | null) ?? null,
    });

    const now = new Date().toISOString();
    const { error: moveErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .update({ bo_dung_cu_id: sub.id, updated_at: now })
      .in("id", plan.subChiTietIds)
      .eq("bo_dung_cu_id", boId);
    if (moveErr) throw new Error(moveErr.message);

    if (mainQtId) {
      await supabase
        .from("cssd_fact_quy_trinh")
        .update({ ma_vai_tro_bo: "MAIN", updated_at: now })
        .eq("id", mainQtId);
    }

    await ensureQuyTrinhSub(supabase, mainQtId, sub.id, sub.ma_bo);

    out.split.push({
      maBo,
      maSub: sub.ma_bo,
      movedLines: plan.subChiTietIds.length,
    });
  }

  return out;
}

export function formatHeatSplitToast(result: HeatSplitApplyResult): string | null {
  if (result.split.length === 0 && result.skipped.length === 0) return null;
  const parts: string[] = [];
  if (result.split.length) {
    parts.push(
      `Đã tách ${result.split.length} bộ: ${result.split
        .map((s) => `${s.maBo} → ${s.maSub} (${s.movedLines} dòng nhạy nhiệt)`)
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
