"use server";

import { revalidatePath } from "next/cache";
import { normalizeQlcvChecklist, qlcvChecklistSchema, type QlcvChecklistItem } from "../lib/qlcv-checklist";
import { assertQlcvTaskVisible, getQlcvListScope } from "../lib/qlcv-list-scope-server";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";

export async function getQlcvChecklist(congViecId: string): Promise<QlcvChecklistItem[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await getQlcvListScope();
  await assertQlcvTaskVisible(congViecId, scope);
  const { data, error } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("checklist")
    .eq("id", congViecId)
    .maybeSingle();

  if (error) throw new Error("Không tải được checklist: " + error.message);
  return normalizeQlcvChecklist(data?.checklist);
}

export async function updateQlcvChecklist(congViecId: string, items: QlcvChecklistItem[]) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const parsed = qlcvChecklistSchema.safeParse(items);
  if (!parsed.success) {
    throw new Error("Checklist không hợp lệ.");
  }

  const scope = await getQlcvListScope();
  await assertQlcvTaskVisible(congViecId, scope);
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
