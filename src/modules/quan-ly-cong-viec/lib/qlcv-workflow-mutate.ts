import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeQlcvTransition, isQlcvTransitionStaleError } from "./qlcv-transition-rpc";

/** Cập nhật trạng thái workflow qua RPC `fn_qlcv_transition` + optimistic lock. */
export async function updateCongViecTrangThaiByMa(
  supabase: SupabaseClient,
  params: {
    id: string;
    currentTrangThaiMa: string | null;
    nextMa: string;
    actorNhanSuId: string | null;
    extra?: Record<string, unknown>;
    activityLyDo?: string;
  },
): Promise<{ updated: boolean }> {
  const patch: Record<string, unknown> = {
    next_trang_thai: params.nextMa,
    ...(params.currentTrangThaiMa ? { current_trang_thai: params.currentTrangThaiMa } : {}),
    ...(params.extra ?? {}),
  };

  try {
    await invokeQlcvTransition(supabase, {
      congViecId: params.id,
      action: "SET_TRANG_THAI",
      actorNhanSuId: params.actorNhanSuId,
      lyDo: params.activityLyDo ?? null,
      patch,
    });
    return { updated: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isQlcvTransitionStaleError(msg)) return { updated: false };
    throw err;
  }
}
