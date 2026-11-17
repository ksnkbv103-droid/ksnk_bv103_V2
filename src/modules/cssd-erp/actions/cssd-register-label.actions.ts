"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { z } from "zod";
import { getErrorMessage, revalidateCssdInventorySurfaces } from "./cssd-action-common";
import { bootstrapCssdQuyTrinhFromBoId } from "../shared/application/cssd-bo-bootstrap";

async function verifyCanRegisterPhysicalLabel(): Promise<void> {
  // Một round-trip: OR của 3 quyền ghi.
  await verifyAnyPermission([
    { moduleKey: "CSSD_KHO_DUNGCU", action: "create" },
    { moduleKey: "CSSD_WORKFLOW", action: "create" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
}

/**
 * Tạo/cập nhật quy_trinh — mã quét = ma_bo (SSOT, vd. B01.SET.01).
 */
export async function registerPhysicalBoLabelFromDmAction(boDungCuId: string): Promise<
  | {
      success: true;
      ma_vach_qr: string;
      ten_bo: string;
      bo_id: string;
      ten_khoa: string | null;
      tong_so_luong_dung_cu: number | null;
      so_khoan: number | null;
      phan_loai_bo: string | null;
    }
  | { success: false; error: string }
> {
  try {
    await verifyCanRegisterPhysicalLabel();
    const supabase = createAdminSupabaseClient();
    const boIdParsed = z.string().trim().min(1).uuid().safeParse(String(boDungCuId ?? ""));
    if (!boIdParsed.success) return { success: false, error: "Thiếu hoặc sai định dạng bộ dụng cụ (danh mục)." };
    const boId = boIdParsed.data;

    const boot = await bootstrapCssdQuyTrinhFromBoId(supabase, boId);
    revalidateCssdInventorySurfaces();

    return {
      success: true,
      ma_vach_qr: boot.ma_vach_qr,
      ten_bo: boot.ten_bo,
      bo_id: boot.bo_id,
      ten_khoa: boot.ten_khoa ?? null,
      tong_so_luong_dung_cu: boot.tong_so_luong_dung_cu ?? null,
      so_khoan: boot.so_khoan ?? null,
      phan_loai_bo: boot.phan_loai_bo ?? null,
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

