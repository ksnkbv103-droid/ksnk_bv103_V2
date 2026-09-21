"use server";

import { verifyAnyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { applyKiemKeBo, applyKiemKeKho } from "@/lib/master-data/cssd-kiem-ke-core";
import { revalidateCssdInventorySurfaces } from "./cssd-action-common";

const WRITE_PERMS = [
  { moduleKey: "CSSD_KHO_DUNGCU", action: "edit" },
  { moduleKey: "CSSD_KHO_DUNGCU", action: "create" },
  { moduleKey: "BO_DC", action: "edit" },
  { moduleKey: "BO_DC", action: "create" },
] as const;

const READ_PERMS = [
  { moduleKey: "CSSD_KHO_DUNGCU", action: "view" },
  { moduleKey: "CSSD_KHO_DUNGCU", action: "edit" },
  { moduleKey: "BO_DC", action: "view" },
  { moduleKey: "BO_DC", action: "edit" },
] as const;

export type KiemKeBoLineRow = {
  loaiDungCuId: string;
  maLoai: string;
  tenLoai: string;
  soLuongChuan: number;
  soLuongThucTe: number;
};

export type KiemKeBoComposition = {
  boDungCuId: string;
  maBo: string;
  tenBo: string;
  trangThai: string | null;
  ngayKiemKeGanNhat: string | null;
  lines: KiemKeBoLineRow[];
};

export type KiemKeKhoLoaiRow = {
  loaiDungCuId: string;
  maLoai: string;
  tenLoai: string;
  soLuongKhoDuPhong: number;
};

async function currentUserId(): Promise<string | null> {
  try {
    const userSb = await createServerSupabaseUserClient();
    const {
      data: { user },
    } = await userSb.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/** Tải thành phần bộ (chuẩn + thực tế) để nhập số đếm kiểm kê. */
export async function loadKiemKeBoCompositionAction(
  boDungCuIdOrMa: string,
): Promise<{ success: true; data: KiemKeBoComposition } | { success: false; error: string }> {
  try {
    await verifyAnyPermission([...READ_PERMS]);
    const raw = String(boDungCuIdOrMa || "").trim();
    if (!raw) return { success: false, error: "Thiếu mã / id bộ dụng cụ." };

    const supabase = createAdminSupabaseClient();
    let boId = raw;
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
    if (!looksLikeUuid) {
      const code = raw.toUpperCase();
      const { data: bo, error } = await supabase
        .from("cssd_dm_bo_dung_cu")
        .select("id")
        .eq("ma_bo", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      boId = String((bo as { id?: string } | null)?.id || "").trim();
      if (!boId) return { success: false, error: "Không tìm thấy bộ dụng cụ." };
    }

    const { data: header, error: hErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo, trang_thai, ngay_kiem_ke_gan_nhat")
      .eq("id", boId)
      .maybeSingle();
    if (hErr) return { success: false, error: hErr.message };
    if (!header) return { success: false, error: "Không tìm thấy bộ dụng cụ." };

    const { data: rows, error } = await supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select(
        "loai_dung_cu_id, ma_loai_dung_cu, ten_loai_dung_cu, so_luong_tieu_chuan, so_luong_thuc_te",
      )
      .eq("bo_dung_cu_id", boId)
      .eq("is_active", true)
      .order("ten_loai_dung_cu");
    if (error) return { success: false, error: error.message };

    const lines: KiemKeBoLineRow[] = (rows || []).map((r) => {
      const row = r as {
        loai_dung_cu_id?: string;
        ma_loai_dung_cu?: string;
        ten_loai_dung_cu?: string;
        so_luong_tieu_chuan?: number;
        so_luong_thuc_te?: number;
      };
      return {
        loaiDungCuId: String(row.loai_dung_cu_id || ""),
        maLoai: String(row.ma_loai_dung_cu || ""),
        tenLoai: String(row.ten_loai_dung_cu || ""),
        soLuongChuan: Math.max(0, Number(row.so_luong_tieu_chuan || 0)),
        soLuongThucTe: Math.max(0, Number(row.so_luong_thuc_te || 0)),
      };
    });

    const h = header as {
      id: string;
      ma_bo?: string;
      ten_bo?: string;
      trang_thai?: string | null;
      ngay_kiem_ke_gan_nhat?: string | null;
    };

    return {
      success: true,
      data: {
        boDungCuId: String(h.id),
        maBo: String(h.ma_bo || ""),
        tenBo: String(h.ten_bo || ""),
        trangThai: h.trang_thai ?? null,
        ngayKiemKeGanNhat: h.ngay_kiem_ke_gan_nhat ?? null,
        lines,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không tải được kiểm kê bộ." };
  }
}

/** Danh sách loại + tồn kho dự phòng để kiểm kê kho. */
export async function listKiemKeKhoLoaiAction(
  q?: string,
): Promise<{ success: true; data: KiemKeKhoLoaiRow[] } | { success: false; error: string }> {
  try {
    await verifyAnyPermission([...READ_PERMS]);
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("cssd_dm_loai_dung_cu")
      .select("id, ma_loai, ten_loai, so_luong_kho_du_phong")
      .eq("is_active", true)
      .order("ma_loai")
      .limit(200);

    const term = String(q || "").trim();
    if (term) {
      query = query.or(`ma_loai.ilike.%${term}%,ten_loai.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data || []).map((r) => {
        const row = r as {
          id?: string;
          ma_loai?: string;
          ten_loai?: string;
          so_luong_kho_du_phong?: number | null;
        };
        return {
          loaiDungCuId: String(row.id || ""),
          maLoai: String(row.ma_loai || ""),
          tenLoai: String(row.ten_loai || ""),
          soLuongKhoDuPhong: Math.max(0, Number(row.so_luong_kho_du_phong || 0)),
        };
      }),
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không tải được kho." };
  }
}

export async function submitKiemKeBoAction(payload: {
  boDungCuId: string;
  lines: { loaiDungCuId: string; dem: number; thucTeHienTai: number }[];
  note?: string;
}): Promise<{ success: true; applied: number } | { success: false; error: string }> {
  try {
    await verifyAnyPermission([...WRITE_PERMS]);
    const supabase = createAdminSupabaseClient();
    const userId = await currentUserId();
    const res = await applyKiemKeBo(supabase, {
      boDungCuId: payload.boDungCuId,
      lines: payload.lines,
      note: payload.note,
      nguoiThucHienId: userId,
    });
    if (!res.success) return res;
    revalidateCssdInventorySurfaces();
    return res;
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không lưu kiểm kê bộ." };
  }
}

export async function submitKiemKeKhoAction(payload: {
  lines: { loaiDungCuId: string; demKho: number; khoCu: number }[];
  note?: string;
}): Promise<{ success: true; applied: number } | { success: false; error: string }> {
  try {
    await verifyAnyPermission([...WRITE_PERMS]);
    const supabase = createAdminSupabaseClient();
    const userId = await currentUserId();
    const res = await applyKiemKeKho(supabase, {
      lines: payload.lines,
      note: payload.note,
      nguoiThucHienId: userId,
    });
    if (!res.success) return res;
    revalidateCssdInventorySurfaces();
    return res;
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không lưu kiểm kê kho." };
  }
}
