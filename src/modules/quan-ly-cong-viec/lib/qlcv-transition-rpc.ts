import type { SupabaseClient } from "@supabase/supabase-js";

export type QlcvTransitionAction =
  | "NGHIEM_THU"
  | "TU_CHOI_NGHIEM_THU"
  | "HUY"
  | "PHE_DUYET_DEXUAT"
  | "TU_CHOI_DEXUAT"
  | "SET_TRANG_THAI";

export type QlcvTransitionResult = {
  id: string;
  trang_thai: string;
};

export async function invokeQlcvTransition(
  supabase: SupabaseClient,
  params: {
    congViecId: string;
    action: QlcvTransitionAction;
    actorNhanSuId: string | null;
    lyDo?: string | null;
    patch?: Record<string, unknown>;
  },
): Promise<QlcvTransitionResult> {
  const { data, error } = await supabase.rpc("fn_qlcv_transition", {
    p_cong_viec_id: params.congViecId,
    p_action: params.action,
    p_actor_nhan_su_id: params.actorNhanSuId,
    p_ly_do: params.lyDo ?? null,
    p_patch: params.patch ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data as QlcvTransitionResult | null;
  if (!row?.id) {
    throw new Error("Không nhận được kết quả chuyển trạng thái.");
  }
  return row;
}

/** Map lỗi optimistic lock → updated: false (giữ contract cũ). */
export function isQlcvTransitionStaleError(message: string): boolean {
  return /đã thay đổi|không cập nhật được/i.test(message);
}
