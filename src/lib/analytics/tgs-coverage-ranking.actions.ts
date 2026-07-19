"use server";

import { z } from "zod";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { BangKiemApDungSource, KhoaApDungContext } from "@/lib/domain/bang-kiem-ap-dung";
import { fetchGscTgsSessionHits } from "@/lib/analytics/gsc-tgs-session-hits";
import {
  buildTgsCoverageRow,
  buildTgsHitSet,
  type TgsCoverageKhoaRow,
} from "@/lib/analytics/tgs-coverage-mappers";

const inputSchema = z.object({
  tu_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  den_ngay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  khoa_ids: z.array(z.string().uuid()).optional(),
});

export type TgsCoverageRankingPayload = {
  tu_ngay: string;
  den_ngay: string;
  rows: TgsCoverageKhoaRow[];
  /** Khoa không có BK bắt buộc TGS trong phạm vi — không tính «thiếu». */
  so_khoa_khong_ap_dung: number;
};

/** Xếp hạng bao phủ TGS theo khoa — breadth distinct BK; ngoài phạm vi = không áp dụng. */
export async function getTgsCoverageRankingAction(
  input: z.infer<typeof inputSchema>,
): Promise<{ success: true; data: TgsCoverageRankingPayload } | { success: false; error: string }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = await createServerSupabaseUserClient();

    let khoaQuery = supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa, ten_khoa, khoi_id, is_active")
      .eq("is_active", true)
      .order("ten_khoa");
    if (parsed.data.khoa_ids?.length) {
      khoaQuery = khoaQuery.in("id", parsed.data.khoa_ids);
    }
    const { data: khoaRows, error: khoaErr } = await khoaQuery;
    if (khoaErr) return { success: false, error: khoaErr.message };

    const { data: catalogRows, error: catErr } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("id, ma_bk, ten_bang_kiem, is_active, phan_loai_chuyen_mon, loai_giam_sat, ap_dung_jsonb")
      .eq("is_active", true);
    if (catErr) return { success: false, error: catErr.message };

    const hitsRes = await fetchGscTgsSessionHits(supabase, {
      tu_ngay: parsed.data.tu_ngay,
      den_ngay: parsed.data.den_ngay,
    });
    if (hitsRes.error) return { success: false, error: hitsRes.error };

    const hitSet = buildTgsHitSet(hitsRes.hits);
    const phienByKhoa = new Map<string, number>();
    for (const h of hitsRes.hits) {
      phienByKhoa.set(h.khoa_id, (phienByKhoa.get(h.khoa_id) ?? 0) + 1);
    }

    const catalog = (catalogRows ?? []) as BangKiemApDungSource[];
    const allRows: TgsCoverageKhoaRow[] = [];
    let soKhoaKhongApDung = 0;

    for (const k of khoaRows ?? []) {
      const khoa: KhoaApDungContext = {
        id: String(k.id),
        khoi_id: k.khoi_id ? String(k.khoi_id) : null,
        ma_khoa: (k.ma_khoa as string | null) ?? null,
        ten_khoa: String(k.ten_khoa ?? ""),
        is_active: true,
      };
      const row = buildTgsCoverageRow({
        khoa,
        catalog,
        hitSet,
        tong_phien_tgs: phienByKhoa.get(khoa.id) ?? 0,
      });
      if (row.so_bk_bat_buoc <= 0) {
        soKhoaKhongApDung += 1;
        continue;
      }
      allRows.push(row);
    }

    allRows.sort((a, b) => {
      if (a.ty_le_bao_phu_tgs !== b.ty_le_bao_phu_tgs) return a.ty_le_bao_phu_tgs - b.ty_le_bao_phu_tgs;
      return b.so_bk_thieu - a.so_bk_thieu;
    });

    return {
      success: true,
      data: {
        tu_ngay: parsed.data.tu_ngay,
        den_ngay: parsed.data.den_ngay,
        rows: allRows,
        so_khoa_khong_ap_dung: soKhoaKhongApDung,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Không tải được xếp hạng bao phủ TGS",
    };
  }
}
