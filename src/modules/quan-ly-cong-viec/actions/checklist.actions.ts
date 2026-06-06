"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeQlcvChecklist, qlcvChecklistSchema, type QlcvChecklistItem } from "../lib/qlcv-checklist";
import { assertQlcvTaskVisible, getQlcvListScope } from "../lib/qlcv-list-scope-server";

export async function getQlcvChecklist(congViecId: string): Promise<QlcvChecklistItem[]> {
  await verifyPermission("CONG_VIEC", "view");
  const scope = await getQlcvListScope();
  await assertQlcvTaskVisible(congViecId, scope);

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("checklist")
    .eq("id", congViecId)
    .maybeSingle();

  if (error) throw new Error("Không tải được checklist: " + error.message);
  return normalizeQlcvChecklist(data?.checklist);
}

export async function updateQlcvChecklist(congViecId: string, items: QlcvChecklistItem[]) {
  await verifyPermission("CONG_VIEC", "view");
  const parsed = qlcvChecklistSchema.safeParse(items);
  if (!parsed.success) {
    throw new Error("Checklist không hợp lệ.");
  }

  const scope = await getQlcvListScope();
  await assertQlcvTaskVisible(congViecId, scope);

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("fn_qlcv_update_checklist", {
    p_cong_viec_id: congViecId,
    p_checklist: parsed.data,
  });

  if (error) {
    throw new Error(
      error.message.includes("fn_qlcv_update_checklist")
        ? "Chưa áp dụng migration checklist QLCV. Chạy npm run mdm:migrate:local."
        : "Không lưu được checklist: " + error.message,
    );
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}
