"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdIncidentPrint, verifyCssdKhoDungCuView } from "@/lib/cssd-server-gates";
import { readSetReconcileBoId, readSetReconcileStatus } from "../domain/cssd-set-reconcile-attrs";

async function verifyCampaignRead() {
  try {
    await verifyCssdIncidentPrint();
  } catch {
    await verifyCssdKhoDungCuView();
  }
}

export type SetReconcileCampaignRow = {
  id: string;
  maBo: string;
  tenBo: string;
  tenKhoa: string | null;
  ngayKiemKe: string | null;
  pendingBom: boolean;
};

export async function listSetReconcileCampaignAction(khoaId?: string) {
  try {
    await verifyCampaignRead();
    const supabase = createAdminSupabaseClient();
    let q = supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo, khoa_su_dung_id, ngay_kiem_ke_gan_nhat, is_active")
      .eq("is_active", true)
      .order("ma_bo")
      .limit(400);
    const khoa = String(khoaId || "").trim();
    if (khoa) q = q.eq("khoa_su_dung_id", khoa);
    const { data: bos, error } = await q;
    if (error) throw new Error(error.message);
    const { data: khoaRows } = await supabase.from("mdm_dm_khoa_phong").select("id, ma_khoa, ten_khoa");
    const khoaMap = new Map(
      (khoaRows || []).map((k) => [
        String(k.id),
        String(k.ma_khoa || "").trim() || String(k.ten_khoa || "").trim(),
      ]),
    );
    const { data: incidents } = await supabase
      .from("cssd_fact_su_co")
      .select("id, attributes")
      .eq("is_active", true)
      .eq("incident_group", "INSTRUMENT")
      .order("created_at", { ascending: false })
      .limit(200);
    const pending = new Set<string>();
    for (const row of incidents || []) {
      const attrs = (row.attributes as Record<string, unknown>) || {};
      if (readSetReconcileStatus(attrs) !== "BOM_PENDING") continue;
      const boId = readSetReconcileBoId(attrs);
      if (boId) pending.add(boId);
    }
    const data: SetReconcileCampaignRow[] = (bos || []).map((b) => ({
      id: String(b.id),
      maBo: String(b.ma_bo || ""),
      tenBo: String(b.ten_bo || ""),
      tenKhoa: b.khoa_su_dung_id ? khoaMap.get(String(b.khoa_su_dung_id)) || null : null,
      ngayKiemKe: b.ngay_kiem_ke_gan_nhat ? String(b.ngay_kiem_ke_gan_nhat) : null,
      pendingBom: pending.has(String(b.id)),
    }));
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không tải đợt rà soát." };
  }
}

export async function listSetReconcileWorksheetRowsAction(khoaId?: string) {
  try {
    await verifyCampaignRead();
    const supabase = createAdminSupabaseClient();
    const camp = await listSetReconcileCampaignAction(khoaId);
    if (!camp.success) return camp;
    const boIds = camp.data.map((b) => b.id);
    if (!boIds.length) return { success: true as const, rows: [] as Record<string, string | number>[] };
    const { data: lines, error } = await supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select("bo_dung_cu_id, ma_bo, ten_bo, ma_loai_dung_cu, ten_loai_dung_cu, so_luong_tieu_chuan, so_luong_thuc_te")
      .in("bo_dung_cu_id", boIds)
      .eq("is_active", true)
      .order("ma_bo");
    if (error) throw new Error(error.message);
    const boMap = new Map(camp.data.map((b) => [b.id, b]));
    const rows = (lines || []).map((r) => {
      const bo = boMap.get(String(r.bo_dung_cu_id));
      return {
        ma_bo: String(r.ma_bo || bo?.maBo || ""),
        ten_bo: String(r.ten_bo || bo?.tenBo || ""),
        ten_khoa: bo?.tenKhoa || "",
        ma_loai: String(r.ma_loai_dung_cu || ""),
        ten_dung_cu: String(r.ten_loai_dung_cu || ""),
        so_luong_chuan: Number(r.so_luong_tieu_chuan || 0),
        so_luong_thuc_te: Number(r.so_luong_thuc_te || 0),
        so_luong_dem: Number(r.so_luong_thuc_te || 0),
        loai_lech: "",
        ghi_chu: "",
      };
    });
    return { success: true as const, rows };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không xuất phiếu kiểm kê." };
  }
}

async function selectAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const page = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await fetchPage(from, from + page - 1);
    if (error) throw new Error(error.message);
    const chunk = data || [];
    out.push(...chunk);
    if (chunk.length < page) return out;
  }
}

export async function listLoaiDungCuForReconcileAction() {
  try {
    await verifyCampaignRead();
    const supabase = createAdminSupabaseClient();
    const rows = await selectAllPages((from, to) =>
      supabase
        .from("cssd_dm_loai_dung_cu")
        .select("id, ten_loai, ma_loai, is_chiu_nhiet, phan_loai_spaulding, phuong_phap_tiet_khuan_chi_dinh, so_luong_kho_du_phong")
        .eq("is_active", true)
        .order("ten_loai")
        .order("id")
        .range(from, to),
    );
    const data = rows.map((r) => ({
      id: String(r.id),
      ma: String(r.ma_loai || "").trim(),
      ten: String(r.ten_loai || r.ma_loai || ""),
      isChiuNhiet: r.is_chiu_nhiet !== false,
      spaulding: String(r.phan_loai_spaulding || ""),
      sterileMethod: String(r.phuong_phap_tiet_khuan_chi_dinh || ""),
      soLuongKho: Math.max(0, Number(r.so_luong_kho_du_phong || 0) || 0),
    }));
    const loaiById = new Map(data.map((o) => [o.id, o]));
    const khacRows = await selectAllPages((from, to) =>
      supabase
        .from("v_cssd_bo_dung_cu_chi_tiet_full")
        .select("ma_khac, loai_dung_cu_id, ma_loai_dung_cu, ten_loai_dung_cu")
        .eq("is_active", true)
        .not("ma_khac", "is", null)
        .order("ma_khac")
        .range(from, to),
    );
    const khacIndex: Array<{
      maKhac: string;
      id: string;
      ma: string;
      ten: string;
      isChiuNhiet: boolean;
      spaulding: string;
      sterileMethod: string;
    }> = [];
    for (const r of khacRows || []) {
      const loaiId = String(r.loai_dung_cu_id || "").trim();
      const loai = loaiById.get(loaiId);
      const fields = {
        id: loaiId || loai?.id || "",
        ma: loai?.ma || String(r.ma_loai_dung_cu || "").trim(),
        ten: loai?.ten || String(r.ten_loai_dung_cu || "").trim(),
        isChiuNhiet: loai?.isChiuNhiet !== false,
        spaulding: loai?.spaulding || "",
        sterileMethod: loai?.sterileMethod || "",
      };
      if (!fields.ma) continue;
      const maKhac = String(r.ma_khac || "").trim().toUpperCase();
      if (!maKhac) continue;
      khacIndex.push({ maKhac, ...fields });
    }
    return {
      success: true as const,
      data,
      khacIndex,
    };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không tải loại dụng cụ." };
  }
}
