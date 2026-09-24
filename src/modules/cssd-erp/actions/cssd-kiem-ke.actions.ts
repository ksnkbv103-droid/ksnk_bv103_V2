"use server";

import { verifyAnyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidateCssdInventorySurfaces } from "@/lib/cssd-server-common";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";

export type KiemKeBoLine = {
  loaiDungCuId: string;
  maLoai: string;
  tenLoai: string;
  soLuongChuan: number;
  soLuongThucTe: number;
  soLuongKho: number;
  soLuongTrongBo: number;
};

export type KiemKeBoPayload = {
  boDungCuId: string;
  maBo: string;
  tenBo: string;
  lines: KiemKeBoLine[];
};

async function verifyKiemKeRead() {
  await verifyAnyPermission([
    { moduleKey: "CSSD_KHO_DUNGCU", action: "view" },
    { moduleKey: "CSSD_WORKFLOW", action: "view" },
  ]);
}

async function verifyKiemKeWrite() {
  await verifyAnyPermission([
    { moduleKey: "CSSD_KHO_DUNGCU", action: "edit" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
}

export async function loadKiemKeBoAction(boDungCuId: string) {
  try {
    await verifyKiemKeRead();
    const boId = String(boDungCuId || "").trim();
    if (!boId) return { success: false as const, error: "Chọn một bộ để kiểm kê." };

    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select(
        "bo_dung_cu_id, ma_bo, ten_bo, loai_dung_cu_id, ma_loai_dung_cu, ten_loai_dung_cu, so_luong_tieu_chuan, so_luong_thuc_te",
      )
      .eq("bo_dung_cu_id", boId)
      .eq("is_active", true)
      .order("ma_loai_dung_cu");
    if (error) return { success: false as const, error: error.message };

    const list = rows || [];
    if (!list.length) {
      return { success: false as const, error: "Bộ chưa có thành phần. Kiểm kê không tạo danh mục." };
    }

    const loaiIds = [...new Set(list.map((r) => String(r.loai_dung_cu_id || "")).filter(Boolean))];
    const [{ data: loaiRows, error: loaiErr }, { data: stockRows, error: stockErr }] = await Promise.all([
      supabase.from("cssd_dm_loai_dung_cu").select("id, so_luong_kho_du_phong").in("id", loaiIds),
      supabase
        .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
        .select("loai_dung_cu_id, so_luong_thuc_te")
        .in("loai_dung_cu_id", loaiIds)
        .eq("is_active", true),
    ]);
    if (loaiErr) return { success: false as const, error: loaiErr.message };
    if (stockErr) return { success: false as const, error: stockErr.message };

    const khoByLoai = new Map(
      (loaiRows || []).map((r) => [String(r.id), Math.trunc(Number(r.so_luong_kho_du_phong || 0))]),
    );
    const trongBo = new Map<string, number>();
    for (const row of stockRows || []) {
      const id = String(row.loai_dung_cu_id || "");
      trongBo.set(id, (trongBo.get(id) || 0) + Math.trunc(Number(row.so_luong_thuc_te || 0)));
    }

    const head = list[0];
    const data: KiemKeBoPayload = {
      boDungCuId: boId,
      maBo: String(head.ma_bo || ""),
      tenBo: String(head.ten_bo || ""),
      lines: list.map((r) => {
        const loaiId = String(r.loai_dung_cu_id || "");
        return {
          loaiDungCuId: loaiId,
          maLoai: String(r.ma_loai_dung_cu || ""),
          tenLoai: String(r.ten_loai_dung_cu || ""),
          soLuongChuan: Math.trunc(Number(r.so_luong_tieu_chuan || 0)),
          soLuongThucTe: Math.trunc(Number(r.so_luong_thuc_te || 0)),
          soLuongKho: khoByLoai.get(loaiId) || 0,
          soLuongTrongBo: trongBo.get(loaiId) || 0,
        };
      }),
    };
    return { success: true as const, data };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Không tải phiếu kiểm kê.";
    console.error({ module: "cssd-kiem-ke", action: "loadKiemKeBoAction", error });
    return { success: false as const, error };
  }
}

export async function postKiemKeCountsAction(input: {
  boDungCuId: string;
  lines: { loaiDungCuId: string; soLuongDem: number; khoDem: number | null }[];
}) {
  try {
    await verifyKiemKeWrite();
    const boId = String(input.boDungCuId || "").trim();
    if (!boId) return { success: false as const, error: "Chọn một bộ để kiểm kê." };

    const supabase = createAdminSupabaseClient();
    let operatorId: string | null = null;
    try {
      const uc = await createServerSupabaseUserClient();
      const { data: userData } = await uc.auth.getUser();
      if (userData.user) {
        operatorId = await resolveCssdOperatorNhanSuId(supabase, {
          authUserId: userData.user.id,
          email: userData.user.email,
        });
      }
    } catch {
      operatorId = null;
    }

    const payload = (input.lines || []).map((line) => ({
      loai_dung_cu_id: String(line.loaiDungCuId || "").trim(),
      so_luong_dem: line.soLuongDem,
      ...(line.khoDem == null ? {} : { kho_dem: line.khoDem }),
    }));

    const { data, error } = await supabase.rpc("rpc_cssd_post_kiem_ke", {
      p_bo_dung_cu_id: boId,
      p_lines: payload,
      p_nguoi_thuc_hien_id: operatorId,
    });
    if (error) {
      const missing = /rpc_cssd_post_kiem_ke|KIEM_KE/i.test(error.message);
      return {
        success: false as const,
        error: missing
          ? "Chưa áp migration kiểm kê trên DB local (20260924120000)."
          : error.message,
      };
    }

    const parsed = (data || {}) as { success?: boolean; message?: string; posted?: number };
    if (!parsed.success) {
      return { success: false as const, error: parsed.message || "Không ghi sổ kiểm kê." };
    }
    revalidateCssdInventorySurfaces();
    return { success: true as const, posted: Number(parsed.posted || 0) };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Không ghi sổ kiểm kê.";
    console.error({ module: "cssd-kiem-ke", action: "postKiemKeCountsAction", error });
    return { success: false as const, error };
  }
}
