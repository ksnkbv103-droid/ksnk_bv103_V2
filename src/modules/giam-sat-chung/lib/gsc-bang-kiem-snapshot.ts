/**
 * BK-1: chốt nội dung bảng kiểm kèm phiên GSC.
 * Lưu trong `gstt_fact_chung_sessions.metadata.bang_kiem_snapshot` (cột metadata sẵn có).
 * Phiếu cũ chưa có ảnh chụp: mở lại theo mẫu đang hiệu lực cho đến khi lưu lại.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChecklistTemplate } from "@/types/giam-sat-chung";
import {
  mapTieuChiJsonbToCriterion,
  type TieuChiJsonbRaw,
} from "./gsc-form-template-sync";
import type { BangKiemCachTinhDiem, BangKiemLoaiGiamSat } from "../types";

export const GSC_BANG_KIEM_SNAPSHOT_META_KEY = "bang_kiem_snapshot" as const;

export type GscBangKiemSnapshot = {
  bang_kiem_id: string;
  ma_bk: string;
  ten_bang_kiem: string;
  loai_giam_sat: string | null;
  cach_tinh_diem: string | null;
  phien_ban: string | null;
  tieu_chi_jsonb: TieuChiJsonbRaw[];
  chot_luc: string;
};

function asTrimmed(raw: unknown): string {
  return String(raw ?? "").trim();
}

function asNullableCode(raw: unknown): string | null {
  const t = asTrimmed(raw).toUpperCase();
  return t || null;
}

/** Tiêu chí đang hiệu lực trên mẫu lúc chốt — khớp form chọn bảng kiểm mới (`activeOnly`). */
export function activeSortedTieuChiJsonb(raw: unknown): TieuChiJsonbRaw[] {
  const rows = Array.isArray(raw) ? (raw as TieuChiJsonbRaw[]) : [];
  return rows
    .filter((t) => t && t.is_active !== false)
    .slice()
    .sort((a, b) => (Number(a.stt) || 0) - (Number(b.stt) || 0));
}

export function parseGscBangKiemSnapshot(raw: unknown): GscBangKiemSnapshot | null {
  let candidate = raw;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const rec = candidate as Record<string, unknown>;
    if (GSC_BANG_KIEM_SNAPSHOT_META_KEY in rec && !Array.isArray(rec.tieu_chi_jsonb)) {
      candidate = rec[GSC_BANG_KIEM_SNAPSHOT_META_KEY];
    }
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const rec = candidate as Record<string, unknown>;
  const bangKiemId = asTrimmed(rec.bang_kiem_id);
  if (!bangKiemId) return null;
  if (!Array.isArray(rec.tieu_chi_jsonb)) return null;
  const chotLuc = asTrimmed(rec.chot_luc) || new Date(0).toISOString();
  return {
    bang_kiem_id: bangKiemId,
    ma_bk: asTrimmed(rec.ma_bk),
    ten_bang_kiem: asTrimmed(rec.ten_bang_kiem) || "Bảng kiểm",
    loai_giam_sat: asNullableCode(rec.loai_giam_sat),
    cach_tinh_diem: asNullableCode(rec.cach_tinh_diem),
    phien_ban: asTrimmed(rec.phien_ban) || null,
    tieu_chi_jsonb: rec.tieu_chi_jsonb as TieuChiJsonbRaw[],
    chot_luc: chotLuc,
  };
}

export function pickGscBangKiemSnapshotForSave(opts: {
  bangKiemId: string;
  existing: GscBangKiemSnapshot | null;
  live: GscBangKiemSnapshot | null;
}): GscBangKiemSnapshot | null {
  const id = asTrimmed(opts.bangKiemId);
  if (opts.existing && opts.existing.bang_kiem_id === id) {
    return opts.existing;
  }
  return opts.live;
}

export function serializeGscBangKiemSnapshotForMetadata(
  snapshot: GscBangKiemSnapshot,
): { bang_kiem_snapshot: GscBangKiemSnapshot } {
  return { [GSC_BANG_KIEM_SNAPSHOT_META_KEY]: snapshot };
}

export function checklistTemplateFromGscBangKiemSnapshot(
  snap: GscBangKiemSnapshot,
): ChecklistTemplate {
  const ma = asTrimmed(snap.ma_bk);
  const lg = asNullableCode(snap.loai_giam_sat);
  const cach = asNullableCode(snap.cach_tinh_diem);
  return {
    id: ma || snap.bang_kiem_id,
    dbId: snap.bang_kiem_id,
    title: snap.ten_bang_kiem || "Bảng kiểm",
    category: "Giám sát chung",
    criteria: (snap.tieu_chi_jsonb || []).map(mapTieuChiJsonbToCriterion),
    loai_giam_sat: (lg as BangKiemLoaiGiamSat | null) ?? null,
    cach_tinh_diem: (cach as BangKiemCachTinhDiem | null) ?? null,
  };
}

export function buildGscBangKiemSnapshotFromLiveRow(
  row: {
    id?: unknown;
    ma_bk?: unknown;
    ten_bang_kiem?: unknown;
    loai_giam_sat?: unknown;
    cach_tinh_diem?: unknown;
    phien_ban?: unknown;
    tieu_chi_jsonb?: unknown;
  },
  chotLuc: string,
): GscBangKiemSnapshot | null {
  const bangKiemId = asTrimmed(row.id);
  if (!bangKiemId) return null;
  return {
    bang_kiem_id: bangKiemId,
    ma_bk: asTrimmed(row.ma_bk),
    ten_bang_kiem: asTrimmed(row.ten_bang_kiem) || "Bảng kiểm",
    loai_giam_sat: asNullableCode(row.loai_giam_sat),
    cach_tinh_diem: asNullableCode(row.cach_tinh_diem),
    phien_ban: asTrimmed(row.phien_ban) || null,
    tieu_chi_jsonb: activeSortedTieuChiJsonb(row.tieu_chi_jsonb),
    chot_luc: chotLuc,
  };
}

/** Đọc mẫu đang hiệu lực để chốt lần đầu (phiên mới hoặc đổi bảng kiểm). */
export async function loadLiveGscBangKiemSnapshot(
  supabase: SupabaseClient,
  bangKiemId: string,
): Promise<GscBangKiemSnapshot | null> {
  const id = asTrimmed(bangKiemId);
  if (!id) return null;
  const { data, error } = await supabase
    .from("gstt_dm_bang_kiem")
    .select("id,ma_bk,ten_bang_kiem,loai_giam_sat,cach_tinh_diem,phien_ban,tieu_chi_jsonb")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return buildGscBangKiemSnapshotFromLiveRow(data, new Date().toISOString());
}
