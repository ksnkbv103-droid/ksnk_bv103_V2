import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bomLineKeyFromTemplate,
  normalizeSpaulding,
  normalizeSteamMethod,
  parseBomLinesFromMetadata,
  unwrapLoaiDungCuRelation,
  type QuyTrinhBomLine,
} from "../domain/cssd-quy-trinh-bom";

type QuyTrinhRow = {
  id?: string;
  bo_dung_cu_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function readQuyTrinhBomContext(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<
  | { ok: true; row: QuyTrinhRow; bomLines: QuyTrinhBomLine[] }
  | { ok: false; message: string }
> {
  const id = String(quyTrinhId || "").trim();
  if (!id) return { ok: false, message: "Thiếu quy_trinh_id." };

  const { data, error } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, bo_dung_cu_id, metadata")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Không tìm thấy quy trình." };

  const row = data as QuyTrinhRow;
  return { ok: true, row, bomLines: parseBomLinesFromMetadata(row.metadata) };
}

/** Khởi tạo metadata.bom_lines từ danh mục bộ nếu chưa có. */
async function syncBomLinesFromTemplate(
  supabase: SupabaseClient,
  quyTrinhId: string,
  boDungCuId: string | null,
): Promise<{ ok: true; bomLines: QuyTrinhBomLine[] } | { ok: false; message: string }> {
  const ctx = await readQuyTrinhBomContext(supabase, quyTrinhId);
  if (!ctx.ok) return ctx;

  if (ctx.bomLines.length > 0) return { ok: true, bomLines: ctx.bomLines };

  const boId = String(boDungCuId || ctx.row.bo_dung_cu_id || "").trim();
  if (!boId) return { ok: false, message: "Chưa gán bộ dụng cụ — không có khuôn mẫu cấu phần." };

  const { data: lines, error: lErr } = await supabase
    .from("v_cssd_bo_thanh_phan_hieu_luc")
    .select("chi_tiet_id, ten_dung_cu_le, so_luong")
    .eq("bo_dung_cu_id", boId);
  if (lErr) return { ok: false, message: lErr.message };

  const bomLines: QuyTrinhBomLine[] = (lines || []).map(
    (ln: { chi_tiet_id?: string | null; ten_dung_cu_le?: string | null; so_luong?: number | null }, index: number) => {
      const qty = Number(ln.so_luong ?? 1) || 1;
      const ten = String(ln.ten_dung_cu_le || "").trim() || "—";
      const chiTietId = ln.chi_tiet_id ? String(ln.chi_tiet_id) : null;
      return {
        line_key: bomLineKeyFromTemplate(chiTietId, ten, index),
        chi_tiet_id: chiTietId,
        ten_dung_cu_le: ten,
        so_luong_ke_hoach: qty,
        so_luong_thuc_te: qty,
      };
    },
  );
  if (!bomLines.length) return { ok: true, bomLines: [] };

  const metadata = { ...(ctx.row.metadata || {}), bom_lines: bomLines };
  const { error: upErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", quyTrinhId);
  if (upErr) return { ok: false, message: upErr.message };

  return { ok: true, bomLines };
}

export type BomLineWithSpec = QuyTrinhBomLine & {
  loai_id: string;
  is_chiu_nhiet: boolean;
  phan_loai_spaulding: string;
  phuong_phap_tiet_khuan_chi_dinh: string;
  phuong_phap_cho_phep: string[];
};

/** Tải BOM runtime kèm thông số loại dụng cụ (Spaulding / chịu nhiệt). */
export async function loadBomLinesWithLoaiSpec(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<
  | { ok: true; bomLines: BomLineWithSpec[] }
  | { ok: false; message: string }
> {
  const ctx = await readQuyTrinhBomContext(supabase, quyTrinhId);
  if (!ctx.ok) return ctx;

  const boId = String(ctx.row.bo_dung_cu_id || "").trim();
  const sync = await syncBomLinesFromTemplate(supabase, quyTrinhId, boId || null);
  if (!sync.ok) return sync;

  const chiTietIds = sync.bomLines.map((l) => l.chi_tiet_id).filter(Boolean) as string[];
  const specByChiTiet = new Map<string, Record<string, unknown>>();

  if (chiTietIds.length > 0) {
    const { data: specs, error: sErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select(
        `
        id,
        cssd_dm_loai_dung_cu (
          id,
          is_chiu_nhiet,
          phan_loai_spaulding,
          phuong_phap_tiet_khuan_chi_dinh,
          phuong_phap_cho_phep
        )
      `,
      )
      .in("id", chiTietIds);
    if (sErr) return { ok: false, message: sErr.message };
    for (const row of specs || []) {
      const id = String((row as { id?: string }).id || "");
      const loai = unwrapLoaiDungCuRelation(
        (row as { cssd_dm_loai_dung_cu?: unknown }).cssd_dm_loai_dung_cu,
      );
      if (id && loai) specByChiTiet.set(id, loai);
    }
  }

  const bomLines: BomLineWithSpec[] = sync.bomLines.map((line) => {
    const spec = line.chi_tiet_id ? specByChiTiet.get(line.chi_tiet_id) : undefined;
    return {
      ...line,
      loai_id: String(spec?.id || line.line_key),
      is_chiu_nhiet: spec?.is_chiu_nhiet === true,
      phan_loai_spaulding: normalizeSpaulding(spec?.phan_loai_spaulding),
      phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(spec?.phuong_phap_tiet_khuan_chi_dinh),
      phuong_phap_cho_phep: Array.isArray(spec?.phuong_phap_cho_phep)
        ? (spec.phuong_phap_cho_phep as unknown[]).map((m) => String(m))
        : [],
    };
  });

  return {
    ok: true,
    bomLines,
  };
}
