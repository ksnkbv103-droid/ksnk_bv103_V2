"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { CSSD_LOAI_PHYSICAL_SELECT, resolveLoaiAlias } from "@/lib/master-data/cssd-loai-dung-cu-map";

export interface DungCuGiaoDichRow {
  id: string;
  loai_dung_cu_id: string;
  bo_dung_cu_id: string | null;
  quy_trinh_id: string | null;
  loai_giao_dich: "NHAP_KHO" | "BAO_HONG" | "BAO_MAT" | "BO_SUNG" | "DIEU_CHUYEN";
  so_luong_thay_doi: number;
  ghi_chu: string | null;
  nguoi_thuc_hien_id: string | null;
  created_at: string;
  is_active: boolean;
  loai_dung_cu?: { ten_loai_dung_cu: string; ma_loai_dung_cu: string } | null;
  bo_dung_cu?: { ten_bo: string; ma_bo: string } | null;
  quy_trinh?: { ma_qr_quy_trinh: string } | null;
}

export async function getDungCuGiaoDichLogsAction(params?: {
  loaiDungCuId?: string;
  boDungCuId?: string;
}) {
  await verifyPermission("LOAI_DC", "view");
  const supabase = await createServerSupabaseUserClient();
  let query = supabase.from("cssd_fact_kho_giao_dich").select("*").eq("is_active", true);

  if (params?.loaiDungCuId) {
    query = query.eq("loai_dung_cu_id", params.loaiDungCuId);
  }
  if (params?.boDungCuId) {
    query = query.eq("bo_dung_cu_id", params.boDungCuId);
  }

  const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) return { success: false as const, error: error.message };

  const list = rows || [];
  const boIds = [...new Set(list.map((r) => String(r.bo_dung_cu_id || "").trim()).filter(Boolean))];
  const loaiIds = [...new Set(list.map((r) => String(r.loai_dung_cu_id || "").trim()).filter(Boolean))];
  const qtIds = [...new Set(list.map((r) => String(r.quy_trinh_id || "").trim()).filter(Boolean))];

  const [boRes, loaiRes, qtRes] = await Promise.all([
    boIds.length
      ? supabase.from("cssd_dm_bo_dung_cu").select("id, ma_bo, ten_bo").in("id", boIds)
      : Promise.resolve({ data: [], error: null }),
    loaiIds.length
      ? supabase.from("cssd_dm_loai_dung_cu").select(CSSD_LOAI_PHYSICAL_SELECT).in("id", loaiIds)
      : Promise.resolve({ data: [], error: null }),
    qtIds.length
      ? supabase.from("cssd_fact_quy_trinh").select("id, ma_qr_quy_trinh").in("id", qtIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (boRes.error) return { success: false as const, error: boRes.error.message };
  if (loaiRes.error) return { success: false as const, error: loaiRes.error.message };
  if (qtRes.error) return { success: false as const, error: qtRes.error.message };

  const boMap = new Map(
    (boRes.data || []).map((b: { id: string; ma_bo?: string | null; ten_bo?: string | null }) => [
      String(b.id),
      { ma_bo: String(b.ma_bo || ""), ten_bo: String(b.ten_bo || "") },
    ]),
  );
  const loaiMap = new Map(
    (loaiRes.data || []).map((l) => {
      const alias = resolveLoaiAlias(l as Parameters<typeof resolveLoaiAlias>[0]);
      return [String((l as { id: string }).id), alias] as const;
    }),
  );
  const qtMap = new Map(
    (qtRes.data || []).map((q: { id: string; ma_qr_quy_trinh?: string | null }) => [
      String(q.id),
      { ma_qr_quy_trinh: String(q.ma_qr_quy_trinh || "") },
    ]),
  );

  const data = list.map((r) => {
    const boId = String(r.bo_dung_cu_id || "").trim();
    const loaiId = String(r.loai_dung_cu_id || "").trim();
    const qtId = String(r.quy_trinh_id || "").trim();
    return {
      ...r,
      bo_dung_cu: boId ? boMap.get(boId) ?? null : null,
      loai_dung_cu: loaiId ? loaiMap.get(loaiId) ?? null : null,
      quy_trinh: qtId ? qtMap.get(qtId) ?? null : null,
    };
  });

  return {
    success: true as const,
    data: data as DungCuGiaoDichRow[],
  };
}
