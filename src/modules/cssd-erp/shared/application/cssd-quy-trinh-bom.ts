import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bomLineKeyFromTemplate,
  mergeBomLineQuantities,
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
  bom_kiem_dem_at?: string | null;
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
    .select("id, bo_dung_cu_id, metadata, bom_kiem_dem_at")
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
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .select("id, ten_dung_cu_le, so_luong")
    .eq("bo_dung_cu_id", boId)
    .eq("is_active", true);
  if (lErr) return { ok: false, message: lErr.message };

  const bomLines: QuyTrinhBomLine[] = (lines || []).map(
    (ln: { id?: string; ten_dung_cu_le?: string | null; so_luong?: number | null }, index: number) => {
      const qty = Number(ln.so_luong ?? 1) || 1;
      const ten = String(ln.ten_dung_cu_le || "").trim() || "—";
      const chiTietId = ln.id ? String(ln.id) : null;
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

async function saveBomLinesOnQuyTrinh(
  supabase: SupabaseClient,
  quyTrinhId: string,
  bomLines: QuyTrinhBomLine[],
  metadataBase?: Record<string, unknown> | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const metadata = { ...(metadataBase || {}), bom_lines: bomLines };
  const { error } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", quyTrinhId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export type BomLineWithSpec = QuyTrinhBomLine & {
  loai_id: string;
  is_chiu_nhiet: boolean;
  phan_loai_spaulding: string;
  phuong_phap_tiet_khuan_chi_dinh: string;
};

/** Tải BOM runtime kèm thông số loại dụng cụ (Spaulding / chịu nhiệt). */
export async function loadBomLinesWithLoaiSpec(
  supabase: SupabaseClient,
  quyTrinhId: string,
): Promise<
  | { ok: true; bomLines: BomLineWithSpec[]; bomKiemDemAt: string | null }
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
          phuong_phap_tiet_khuan_chi_dinh
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
      is_chiu_nhiet: spec?.is_chiu_nhiet !== false,
      phan_loai_spaulding: normalizeSpaulding(spec?.phan_loai_spaulding),
      phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(spec?.phuong_phap_tiet_khuan_chi_dinh),
    };
  });

  return {
    ok: true,
    bomLines,
    bomKiemDemAt: ctx.row.bom_kiem_dem_at ?? null,
  };
}

export async function applyBomCheckpointLines(
  supabase: SupabaseClient,
  quyTrinhId: string,
  updates: Array<{ line_key: string; so_luong_thuc_te: number }>,
): Promise<{ ok: true; bomLines: QuyTrinhBomLine[] } | { ok: false; message: string }> {
  const ctx = await readQuyTrinhBomContext(supabase, quyTrinhId);
  if (!ctx.ok) return ctx;

  const boId = String(ctx.row.bo_dung_cu_id || "").trim();
  const sync = await syncBomLinesFromTemplate(supabase, quyTrinhId, boId || null);
  if (!sync.ok) return sync;

  const merged = mergeBomLineQuantities(sync.bomLines, updates);
  const saved = await saveBomLinesOnQuyTrinh(supabase, quyTrinhId, merged, ctx.row.metadata || {});
  if (!saved.ok) return saved;
  return { ok: true, bomLines: merged };
}

/** Điều chuyển số lượng một dòng BOM giữa hai quy trình (metadata.bom_lines). */
export async function transferBomLineBetweenQuyTrinh(
  supabase: SupabaseClient,
  opts: { tuQuyTrinhId: string; denQuyTrinhId: string; tenDungCuLe: string; soLuong: number },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ten = String(opts.tenDungCuLe || "").trim();
  const n = Math.floor(Number(opts.soLuong || 0));
  if (!ten || n < 1) return { ok: false, message: "Thiếu tên cấu phần hoặc số lượng không hợp lệ." };

  const tuCtx = await readQuyTrinhBomContext(supabase, opts.tuQuyTrinhId);
  if (!tuCtx.ok) return tuCtx;
  const denCtx = await readQuyTrinhBomContext(supabase, opts.denQuyTrinhId);
  if (!denCtx.ok) return denCtx;

  await syncBomLinesFromTemplate(supabase, opts.tuQuyTrinhId, tuCtx.row.bo_dung_cu_id ?? null);
  await syncBomLinesFromTemplate(supabase, opts.denQuyTrinhId, denCtx.row.bo_dung_cu_id ?? null);

  const tuReload = await readQuyTrinhBomContext(supabase, opts.tuQuyTrinhId);
  if (!tuReload.ok) return tuReload;
  const denReload = await readQuyTrinhBomContext(supabase, opts.denQuyTrinhId);
  if (!denReload.ok) return denReload;

  const lineTuIdx = tuReload.bomLines.findIndex((l) => l.ten_dung_cu_le === ten);
  if (lineTuIdx < 0) return { ok: false, message: "Không tìm thấy cấu phần trên bộ nguồn." };

  const lineTu = tuReload.bomLines[lineTuIdx];
  if (lineTu.so_luong_thuc_te < n) {
    return { ok: false, message: `Không đủ số lượng thực tế trên nguồn (còn ${lineTu.so_luong_thuc_te}).` };
  }

  const tuLines = [...tuReload.bomLines];
  tuLines[lineTuIdx] = { ...lineTu, so_luong_thuc_te: lineTu.so_luong_thuc_te - n };

  const denLines = [...denReload.bomLines];
  const lineDenIdx = denLines.findIndex((l) => l.ten_dung_cu_le === ten);
  if (lineDenIdx >= 0) {
    const cur = denLines[lineDenIdx];
    denLines[lineDenIdx] = { ...cur, so_luong_thuc_te: cur.so_luong_thuc_te + n };
  } else {
    denLines.push({
      line_key: lineTu.line_key,
      chi_tiet_id: lineTu.chi_tiet_id,
      ten_dung_cu_le: ten,
      so_luong_ke_hoach: lineTu.so_luong_ke_hoach,
      so_luong_thuc_te: n,
    });
  }

  const saveTu = await saveBomLinesOnQuyTrinh(
    supabase,
    opts.tuQuyTrinhId,
    tuLines,
    tuReload.row.metadata || {},
  );
  if (!saveTu.ok) return saveTu;

  const saveDen = await saveBomLinesOnQuyTrinh(
    supabase,
    opts.denQuyTrinhId,
    denLines,
    denReload.row.metadata || {},
  );
  if (!saveDen.ok) return saveDen;

  return { ok: true };
}
