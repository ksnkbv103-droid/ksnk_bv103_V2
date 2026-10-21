import { isAllowedNkbvMdmLoaiCode } from "../lib/nkbv-loai-labels";
import { createServerSupabaseUserClient, type createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  metadataWithoutCaseAnalysisStamp,
  shouldReleaseDaPhanTichOnHide,
  viSinhIdsLinkedOnCase,
} from "../lib/nkbv-hide-case-vi-sinh";

export type Payload = Record<string, unknown>;

/** NK-AUTH: mọi thay đổi sang XAC_NHAN/LOAI_TRU đi qua RPC (kiểm trạng thái, lý do, chặn tự duyệt, ghi người/giờ duyệt). */
export async function callThamDinhRpc(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  args: { id: string; decision: "APPROVE" | "EXCLUDE"; lyDo?: string | null; notesPatch?: Record<string, unknown> | null },
) {
  const uc = await createServerSupabaseUserClient();
  const { data: au } = await uc.auth.getUser();
  const userId = au.user?.id ? String(au.user.id) : "";
  if (!userId) throw new Error("Không xác định được người thẩm định.");
  const { error } = await supabase.rpc("rpc_nkbv_tham_dinh_ca", {
    p_id: args.id,
    p_decision: args.decision,
    p_ly_do: args.lyDo ?? null,
    p_notes_patch: args.notesPatch ?? null,
    p_actor_user_id: userId,
  });
  if (error) throw new Error(error.message);
  const { data, error: readErr } = await supabase.from("nkbv_fact_su_kien").select().eq("id", args.id).single();
  if (readErr) throw new Error(readErr.message);
  return data;
}

export function clean(payload: Payload): Payload {
  const o = { ...payload };
  Object.keys(o).forEach((k) => {
    if (o[k] === "") o[k] = null;
  });
  return o;
}

export async function validateLoaiTrangAndLyDo(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  loai_nkbv_id: string,
  trang_thai_id: string,
  ly_do_loai_tru: unknown,
) {
  const { data: tt, error: et } = await supabase
    .from("nkbv_dm_trang_thai_ca")
    .select("id, ma_trang_thai")
    .eq("id", trang_thai_id)
    .eq("is_active", true)
    .maybeSingle();
  if (et) throw new Error(et.message);
  if (!tt?.id) throw new Error("Trạng thái phiếu không hợp lệ.");

  const { data: lo, error: el } = await supabase
    .from("nkbv_dm_loai")
    .select("id, ma_loai")
    .eq("id", loai_nkbv_id)
    .eq("is_active", true)
    .maybeSingle();
  if (el) throw new Error(el.message);
  if (!lo) throw new Error("Loại NKBV không hợp lệ.");
  const loMa = String((lo as { ma_loai?: string }).ma_loai || "").trim();
  if (!isAllowedNkbvMdmLoaiCode(loMa)) {
    throw new Error(
      `Loại NKBV «${loMa || loai_nkbv_id}» không thuộc allowlist CDC (BSI/UTI/SSI/VAE/VAP/HAP/CH17…).`,
    );
  }

  const ttMa = String((tt as { ma_trang_thai?: string }).ma_trang_thai || "");
  if (ttMa === "LOAI_TRU" && !String(ly_do_loai_tru ?? "").trim()) {
    throw new Error("Trạng thái Loại trừ: vui lòng nhập lý do loại trừ.");
  }
}

async function otherActiveCaseClaimsViSinh(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  hiddenCaseId: string,
  viSinhId: string,
): Promise<{ claimed: boolean; error?: string }> {
  const variants = [viSinhId, `lis:${viSinhId}`];
  for (const variant of variants) {
    const { data, error } = await supabase
      .from("nkbv_fact_su_kien")
      .select("id")
      .eq("is_active", true)
      .neq("id", hiddenCaseId)
      .filter("verification_data->>index_vi_sinh_id", "eq", variant)
      .limit(1);
    if (error) return { claimed: true, error: error.message };
    if ((data || []).length > 0) return { claimed: true };
  }
  for (const variant of variants) {
    const { data, error } = await supabase
      .from("nkbv_fact_su_kien")
      .select("id")
      .eq("is_active", true)
      .neq("id", hiddenCaseId)
      .contains("verification_data", { attributed_vi_sinh_ids: [variant] })
      .limit(1);
    if (error) return { claimed: true, error: error.message };
    if ((data || []).length > 0) return { claimed: true };
  }
  return { claimed: false };
}

/** Trước khi ẩn phiếu: trả XN về hàng chờ nếu không phiếu đang hiện khác còn giữ. */
export async function releaseViSinhStampsAfterHide(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  hiddenCaseId: string,
  verification: unknown,
): Promise<string | null> {
  const ids = viSinhIdsLinkedOnCase(verification);
  const now = new Date().toISOString();
  for (const viSinhId of ids) {
    const claimed = await otherActiveCaseClaimsViSinh(supabase, hiddenCaseId, viSinhId);
    if (claimed.error) return claimed.error;
    const { data: row, error: loadErr } = await supabase
      .from("nkbv_fact_vi_sinh")
      .select("id, metadata")
      .eq("id", viSinhId)
      .maybeSingle();
    if (loadErr) return loadErr.message;
    if (!row) continue;
    if (
      !shouldReleaseDaPhanTichOnHide({
        metadata: row.metadata,
        hiddenCaseId,
        stillClaimedByOtherActiveCase: claimed.claimed,
      })
    ) {
      continue;
    }
    const { error } = await supabase
      .from("nkbv_fact_vi_sinh")
      .update({
        metadata: metadataWithoutCaseAnalysisStamp(row.metadata),
        updated_at: now,
      })
      .eq("id", viSinhId);
    if (error) return error.message;
  }
  return null;
}
