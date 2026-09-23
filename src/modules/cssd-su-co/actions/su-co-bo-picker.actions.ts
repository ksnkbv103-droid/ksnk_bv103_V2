"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import {
  listSuCoSelectableSets,
  resolveSelectableSuCoSet,
} from "../application/su-co-open-cycle-query";

/** Bộ còn chu trình xử lý — picker / tìm kiếm sự cố. Không trả danh mục thuần. */
export async function listActiveBoForInstrumentTransferAction(search?: string) {
  await verifyPermission("BAO_SU_CO", "view");
  const supabase = createAdminSupabaseClient();
  const listed = await listSuCoSelectableSets(supabase, search);
  if (!listed.ok) {
    console.error({ module: "cssd-su-co", action: "listSelectableSets", error: listed.error });
    return { success: false as const, error: listed.error };
  }
  return { success: true as const, data: listed.data };
}

/** Quét / nhập mã bộ trên phiếu sự cố — chỉ nhận chu trình đang mở. */
export async function resolveSuCoSelectableBoAction(rawCode: string) {
  await verifyPermission("BAO_SU_CO", "view");
  const supabase = createAdminSupabaseClient();
  const gate = await resolveSelectableSuCoSet(supabase, rawCode);
  if (!gate.ok) return { success: false as const, error: gate.error };
  return {
    success: true as const,
    code: gate.code,
    quyTrinhId: gate.quyTrinhId,
    boDungCuId: gate.boDungCuId,
  };
}
