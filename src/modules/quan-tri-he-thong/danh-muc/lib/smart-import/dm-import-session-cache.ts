/**
 * Cache tra danh mục trong một phiên import (một lần gọi smartImportData).
 * Giảm round-trip và tránh đọc full bảng lặp lại theo từng dòng Excel.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DM_TABLE_BY_LOAI, normalizeImportMa } from "./import-ma-utils";

export type DmImportIdResolve = string | null | { error: string };

/** Kết quả tra `dm_to_cong_tac` theo `ten_to` (tối đa 5 dòng — giữ ngữ nghĩa cũ). */
export type ToCongTacTenLookupResult =
  | { ok: true; rows: { id: string; ma_to?: string; ten_to?: string }[] }
  | { ok: false; error: string };

export type SmartImportDmSessionCache = {
  resolveDanhMucId(maLookup: string, loai: string): Promise<DmImportIdResolve>;
  resolveNgheNghiepIdByTen(tenNgheNghiep: string): Promise<DmImportIdResolve>;
  /** Một query / phiên cho cùng một `ten_to` (cache theo chuỗi đã chuẩn hóa như import). */
  getToCongTacRowsByTen(tenToCongTac: string): Promise<ToCongTacTenLookupResult>;
};

export function createDmImportSessionCache(sb: SupabaseClient): SmartImportDmSessionCache {
  let roleRows: { id: string; name?: string }[] | null = null;
  let nnRows: { id: string; ma_nghe_nghiep?: string; ten_nghe_nghiep?: string }[] | null = null;
  const dmMaCache = new Map<string, DmImportIdResolve>();
  const toCongTacTenCache = new Map<string, ToCongTacTenLookupResult>();

  async function ensureRoles(): Promise<{ error?: string }> {
    if (roleRows !== null) return {};
    const { data, error } = await sb.from("dm_roles").select("id, name");
    if (error) return { error: error.message };
    roleRows = (data || []) as { id: string; name?: string }[];
    return {};
  }

  async function ensureNgheNghiep(): Promise<{ error?: string }> {
    if (nnRows !== null) return {};
    const { data, error } = await sb.from("dm_nghe_nghiep").select("id, ma_nghe_nghiep, ten_nghe_nghiep");
    if (error) return { error: error.message };
    nnRows = (data || []) as { id: string; ma_nghe_nghiep?: string; ten_nghe_nghiep?: string }[];
    return {};
  }

  return {
    async resolveDanhMucId(maLookup: string, loai: string): Promise<DmImportIdResolve> {
      if (!maLookup) return null;
      const key = `${loai}:${maLookup}`;
      if (dmMaCache.has(key)) return dmMaCache.get(key)!;

      if (loai === "VAI_TRO_HE_THONG_KSNK") {
        const err = await ensureRoles();
        if (err.error) {
          const r = { error: err.error };
          dmMaCache.set(key, r);
          return r;
        }
        const matched = roleRows!.find((row) => normalizeImportMa(row.name) === maLookup);
        const res: DmImportIdResolve = matched?.id ?? null;
        dmMaCache.set(key, res);
        return res;
      }

      if (loai === "KHOA_PHONG") {
        const { data: khoa, error: khoaErr } = await sb
          .from("dm_khoa_phong")
          .select("id")
          .eq("ma_khoa", maLookup)
          .limit(1)
          .maybeSingle();
        if (khoaErr) {
          const r = { error: khoaErr.message };
          dmMaCache.set(key, r);
          return r;
        }
        const id =
          khoa && typeof khoa === "object" && "id" in khoa && (khoa as { id?: string }).id
            ? (khoa as { id: string }).id
            : null;
        dmMaCache.set(key, id);
        return id;
      }

      const dmTarget = DM_TABLE_BY_LOAI[loai];
      if (dmTarget) {
        const { data, error } = await sb
          .from(dmTarget.table)
          .select("id")
          .eq(dmTarget.ma, maLookup)
          .limit(1)
          .maybeSingle();
        if (error) {
          const r = { error: error.message };
          dmMaCache.set(key, r);
          return r;
        }
        const id =
          data && typeof data === "object" && "id" in data && (data as { id?: string }).id
            ? (data as { id: string }).id
            : null;
        dmMaCache.set(key, id);
        return id;
      }

      const res: DmImportIdResolve = null;
      dmMaCache.set(key, res);
      return res;
    },

    async resolveNgheNghiepIdByTen(tenNgheNghiep: string): Promise<DmImportIdResolve> {
      const normTen = normalizeImportMa(tenNgheNghiep);
      if (!normTen) return null;
      const key = `NGHE_NGHIEP_TEN:${normTen}`;
      if (dmMaCache.has(key)) return dmMaCache.get(key)!;

      const err = await ensureNgheNghiep();
      if (err.error) {
        const r = { error: err.error };
        dmMaCache.set(key, r);
        return r;
      }
      const matched = nnRows!.find((row) => normalizeImportMa(row.ten_nghe_nghiep) === normTen);
      const res: DmImportIdResolve = matched?.id ?? null;
      dmMaCache.set(key, res);
      return res;
    },

    async getToCongTacRowsByTen(tenToCongTac: string): Promise<ToCongTacTenLookupResult> {
      const t = tenToCongTac.trim();
      const key = `TO_TEN:${t}`;
      if (toCongTacTenCache.has(key)) return toCongTacTenCache.get(key)!;
      if (!t) {
        const empty: ToCongTacTenLookupResult = { ok: true, rows: [] };
        toCongTacTenCache.set(key, empty);
        return empty;
      }
      const { data: toRows, error: toTenErr } = await sb
        .from("dm_to_cong_tac")
        .select("id, ma_to, ten_to")
        .eq("ten_to", t)
        .limit(5);
      if (toTenErr) {
        const r: ToCongTacTenLookupResult = { ok: false, error: toTenErr.message };
        toCongTacTenCache.set(key, r);
        return r;
      }
      const r: ToCongTacTenLookupResult = {
        ok: true,
        rows: (toRows || []) as { id: string; ma_to?: string; ten_to?: string }[],
      };
      toCongTacTenCache.set(key, r);
      return r;
    },
  };
}
