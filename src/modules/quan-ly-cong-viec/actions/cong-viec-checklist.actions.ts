"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import {
  normalizeQlcvChecklist,
  percentFromQlcvChecklist,
  type QlcvChecklistItem,
} from "@/lib/domain/qlcv-checklist";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { trangThaiCongViecSauBaoCaoTienDo } from "../lib/qlcv-trang-thai-after-bao-cao-tien-do";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { persistQlcvChecklistViaRpc } from "../lib/qlcv-checklist-persist";
import { formatQlcvDbError } from "../lib/qlcv-supabase-error";

export async function updateQlcvChecklist(id: string, items: QlcvChecklistItem[]) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  const normalized = normalizeQlcvChecklist(items);
  const pct = percentFromQlcvChecklist(normalized);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, trang_thai, trang_thai_id, is_active, nguoi_phu_trach_id, phan_tram_hoan_thanh")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const wf = qlcvWorkflowMaFromViewRow(cur);
  if (isDeXuatChoDuyet(wf)) throw new Error("Đề xuất chưa được phê duyệt.");
  if (isChoNghiemThuHoanThanh(wf)) {
    throw new Error("Việc đang chờ nghiệm thu — không cập nhật checklist tại đây.");
  }
  if (wf.trang_thai === "HOAN_THANH" || wf.trang_thai === "DA_HUY") {
    throw new Error("Phiếu đã đóng.");
  }

  const adminBypass = await hasRBACAdminSupervisionBypass();
  if (!adminBypass) {
    const isAssignee =
      Boolean(actorNhanSuId && cur.nguoi_phu_trach_id) &&
      String(actorNhanSuId) === String(cur.nguoi_phu_trach_id);
    if (!isAssignee) await verifyPermission("CONG_VIEC", "edit");
  }

  const stMoi = trangThaiCongViecSauBaoCaoTienDo(pct, wf.trang_thai);

  let result: { phan_tram_hoan_thanh: number };
  try {
    result = await persistQlcvChecklistViaRpc(supabase, {
      congViecId: id,
      items: normalized,
      phanTramHoanThanh: pct,
      trangThaiMa: stMoi,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Không lưu được checklist.";
    throw new Error(formatQlcvDbError(msg));
  }

  const oldPct = Number(cur.phan_tram_hoan_thanh ?? 0);
  if (pct !== oldPct || normalized.length > 0) {
    const done = normalized.filter((i) => i.done).length;
    await supabase.from("fact_cong_viec_hoat_dong").insert({
      id_cong_viec: id,
      loai_hoat_dong: "BAO_CAO_TIEN_DO",
      nguoi_thuc_hien_id: actorNhanSuId,
      noi_dung:
        normalized.length > 0
          ? `Checklist: ${done}/${normalized.length} mục (${pct}%)`
          : `Cập nhật tiến độ ${pct}%`,
      phan_tram_hoan_thanh: pct,
    });
  }

  revalidatePath("/quan-ly-cong-viec");
  return { phan_tram_hoan_thanh: result.phan_tram_hoan_thanh };
}
