"use server";

import { z } from "zod";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { validateLyDoTuChoi } from "@/lib/domain/cssd-kho-hoa-chat-duyet";
import { getErrorMessage, mapFkError, revalidateCssdChemicalSurfaces } from "./cssd-action-common";

const duyetSchema = z.object({
  giao_dich_id: z.string().uuid("Phiếu không hợp lệ."),
  quyet_dinh: z.enum(["DUYET", "TU_CHOI"]),
  ly_do: z.string().max(500).nullish(),
});

/** HC-C: duyệt / từ chối phiếu nhập·xuất. Quyền CSSD_HOA_CHAT.approve kiểm ở server; actor lấy từ session. */
export async function duyetPhieuKhoHoaChatAction(input: {
  giao_dich_id: string;
  quyet_dinh: "DUYET" | "TU_CHOI";
  ly_do?: string | null;
}) {
  try {
    await verifyPermission("CSSD_HOA_CHAT", "approve");
    const parsed = duyetSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
    const { giao_dich_id, quyet_dinh, ly_do } = parsed.data;
    const loi = validateLyDoTuChoi(quyet_dinh, ly_do);
    if (loi) return { success: false as const, error: loi };

    const uc = await createServerSupabaseUserClient();
    const { data: au, error: auErr } = await uc.auth.getUser();
    const userId = au.user?.id ? String(au.user.id) : "";
    if (auErr || !userId) return { success: false as const, error: "Không xác định được người duyệt." };

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("rpc_cssd_kho_hoa_chat_duyet_phieu", {
      p_giao_dich_id: giao_dich_id,
      p_quyet_dinh: quyet_dinh,
      p_ly_do: quyet_dinh === "TU_CHOI" ? String(ly_do).trim() : null,
      p_actor_user_id: userId,
    });
    if (error) {
      if (error.code === "P0001") return { success: false as const, error: error.message };
      return { success: false as const, error: mapFkError(error.message) };
    }
    revalidateCssdChemicalSurfaces();
    const d = (data || {}) as { trang_thai?: string; tu_duyet_ngoai_le?: boolean };
    return { success: true as const, trang_thai: d.trang_thai ?? null, tu_duyet_ngoai_le: Boolean(d.tu_duyet_ngoai_le) };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
