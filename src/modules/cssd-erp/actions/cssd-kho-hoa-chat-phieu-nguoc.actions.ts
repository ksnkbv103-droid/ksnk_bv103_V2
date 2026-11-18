"use server";

import { z } from "zod";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getErrorMessage, mapFkError, revalidateCssdChemicalSurfaces } from "./cssd-action-common";

const inputSchema = z.object({
  giao_dich_id: z.string().trim().uuid("Phiếu gốc không hợp lệ."),
  ly_do: z.string().trim().min(1, "Nhập lý do lập phiếu ngược.").max(500, "Lý do tối đa 500 ký tự."),
});

/**
 * CSSD-034 (PO 2026-11-17): đảo một phiếu XUẤT đã duyệt bằng phiếu NHẬP mới (chứng từ ngược) trỏ về phiếu gốc.
 * Không sửa số tồn: phiếu ngược nằm CHO_DUYET như mọi phiếu, tồn chỉ đổi khi duyệt (cùng đường `duyetPhieuKhoHoaChatAction`).
 * Mọi điều kiện (gốc phải XUẤT + DA_DUYET, một phiếu ngược hiệu lực mỗi gốc, lý do bắt buộc) do RPC kiểm trong khóa.
 */
export async function lapPhieuNguocKhoHoaChatAction(input: { giao_dich_id: string; ly_do: string }) {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const parsed = inputSchema.safeParse({ giao_dich_id: input.giao_dich_id, ly_do: input.ly_do });
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const uc = await createServerSupabaseUserClient();
    const { data: au, error: auErr } = await uc.auth.getUser();
    const userId = au.user?.id ? String(au.user.id) : "";
    if (auErr || !userId) return { success: false as const, error: "Không xác định được người thực hiện." };

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("rpc_cssd_kho_hoa_chat_lap_phieu_nguoc", {
      p_phieu_goc_id: parsed.data.giao_dich_id,
      p_ly_do: parsed.data.ly_do,
      p_actor_user_id: userId,
    });
    if (error) {
      if (error.code === "P0001") return { success: false as const, error: error.message };
      console.error({ module: "cssd-kho-hoa-chat", action: "lapPhieuNguoc", userId, error: error.message });
      if (error.code === "23505") return { success: false as const, error: "Phiếu này đã có phiếu ngược." };
      return { success: false as const, error: mapFkError(error.message) };
    }
    revalidateCssdChemicalSurfaces();
    return { success: true as const, id: typeof data === "string" ? data : null };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
