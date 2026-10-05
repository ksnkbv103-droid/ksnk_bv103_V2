"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import {
  normalizeQlcvChecklist,
  percentFromQlcvChecklist,
  taskUsesQlcvChecklistForProgress,
  type QlcvChecklistItem,
} from "@/lib/domain/qlcv-checklist";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { trangThaiCongViecSauBaoCaoTienDo } from "../lib/qlcv-trang-thai-after-bao-cao-tien-do";
import { isQlcvLoaiDinhKy } from "@/lib/domain/qlcv/dinh-ky-auto-complete";
import { isEligibleForNghiemThu } from "@/lib/domain/qlcv/nghiem-thu-gate";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { persistQlcvChecklistViaRpc } from "../lib/qlcv-checklist-persist";
import { formatQlcvDbError } from "../lib/qlcv-supabase-error";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { assertQlcvRowInListScope, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { appendQlcvNhatKy } from "../lib/qlcv-nhat-ky";
import { updateCongViecTrangThaiByMa } from "../lib/qlcv-workflow-mutate";
import type { SupabaseClient } from "@supabase/supabase-js";


/**
 * Ghi checklist/% qua RPC (null status). Transition chỉ khi RPC chưa tự đóng phiếu
 * (DINH_KY@100% SQL có thể đã set HOAN_THANH — tránh optimistic lock stale).
 */
async function persistProgressThenMaybeTransition(
  supabase: SupabaseClient,
  params: {
    congViecId: string;
    items: QlcvChecklistItem[];
    pct: number;
    stMoi: string | null;
    currentTrangThaiMa: string | null;
    actorNhanSuId: string | null;
    activityLyDo?: string;
  },
): Promise<{ phan_tram_hoan_thanh: number }> {
  const result = await persistQlcvChecklistViaRpc(supabase, {
    congViecId: params.congViecId,
    items: params.items,
    phanTramHoanThanh: params.pct,
    trangThaiMa: null,
  });

  if (params.stMoi) {
    const { data: afterRow } = await supabase
      .from("v_qlcv_cong_viec_full")
      .select("trang_thai")
      .eq("id", params.congViecId)
      .maybeSingle();
    const afterMa = normalizeQlcvTrangThaiToCanonical(
      afterRow?.trang_thai != null ? String(afterRow.trang_thai) : null,
    );
    if (afterMa === params.stMoi) {
      return result;
    }
    const { updated } = await updateCongViecTrangThaiByMa(supabase, {
      id: params.congViecId,
      currentTrangThaiMa: afterMa || params.currentTrangThaiMa,
      nextMa: params.stMoi,
      actorNhanSuId: params.actorNhanSuId,
      activityLyDo:
        params.activityLyDo ||
        (params.stMoi === "HOAN_THANH"
          ? "Hoàn thành định kỳ — đủ tiến độ/checklist"
          : params.stMoi === "CHO_DUYET"
            ? "Báo đủ tiến độ — chờ nghiệm thu"
            : "Cập nhật trạng thái theo tiến độ"),
      extra:
        params.stMoi === "HOAN_THANH" || params.stMoi === "CHO_DUYET"
          ? { phan_tram_hoan_thanh: params.pct }
          : undefined,
    });
    if (!updated) {
      throw new Error("Trạng thái công việc đã thay đổi — tải lại phiếu rồi thử lại.");
    }
  }

  return result;
}

export async function updateQlcvChecklist(id: string, items: QlcvChecklistItem[]) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await resolveQlcvListScope(supabase);
  const actorNhanSuId = await getActorNhanSuId();
  const normalized = normalizeQlcvChecklist(items);
  const pct = percentFromQlcvChecklist(normalized);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, trang_thai, is_active, nguoi_phu_trach_id, phan_tram_hoan_thanh, nguoi_tao_id, loai_cong_viec, han_hoan_thanh, is_qua_han",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  assertQlcvRowInListScope(
    {
      nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
      nguoi_tao_id: cur.nguoi_tao_id,
    },
    scope,
  );

  const wf = qlcvWorkflowMaFromViewRow(cur);
  if (isDeXuatChoDuyet(wf)) throw new Error("Đề xuất chưa được phê duyệt.");
  if (isEligibleForNghiemThu({ ...cur, ...wf })) {
    throw new Error("Việc đang chờ nghiệm thu — không cập nhật checklist tại đây.");
  }
  const stClosed = normalizeQlcvTrangThaiToCanonical(wf.trang_thai);
  if (stClosed === "HOAN_THANH" || stClosed === "DA_HUY") {
    throw new Error("Phiếu đã đóng.");
  }

  const adminBypass = await hasRBACAdminSupervisionBypass();
  if (!adminBypass) {
    const isAssignee =
      Boolean(actorNhanSuId && cur.nguoi_phu_trach_id) &&
      String(actorNhanSuId) === String(cur.nguoi_phu_trach_id);
    if (!isAssignee) await verifyPermission("CONG_VIEC", "edit");
  }

  const stMoi = trangThaiCongViecSauBaoCaoTienDo(
    pct,
    wf.trang_thai,
    typeof cur.loai_cong_viec === "string" ? cur.loai_cong_viec : null,
  );

  let result: { phan_tram_hoan_thanh: number };
  try {
    result = await persistProgressThenMaybeTransition(supabase, {
      congViecId: id,
      items: normalized,
      pct,
      stMoi,
      currentTrangThaiMa: wf.trang_thai ? String(wf.trang_thai) : null,
      actorNhanSuId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Không lưu được checklist.";
    throw new Error(formatQlcvDbError(msg));
  }

  const oldPct = Number(cur.phan_tram_hoan_thanh ?? 0);
  if (pct !== oldPct || normalized.length > 0) {
    const done = normalized.filter((i) => i.done).length;
    await appendQlcvNhatKy(supabase, {
      congViecId: id,
      loaiHoatDong: "BAO_CAO_TIEN_DO",
      nguoiThucHienId: actorNhanSuId,
      noiDung:
        normalized.length > 0
          ? `Checklist: ${done}/${normalized.length} mục (${pct}%)`
          : `Cập nhật tiến độ ${pct}%`,
      phanTramHoanThanh: pct,
    });
  }
  if (stMoi === "HOAN_THANH") {
    await appendQlcvNhatKy(supabase, {
      congViecId: id,
      loaiHoatDong: "HOAN_THANH",
      nguoiThucHienId: actorNhanSuId,
      noiDung: "Hoàn thành — việc định kỳ đã tick đủ.",
      trangThai: "HOAN_THANH",
      phanTramHoanThanh: pct,
    });
  }

  revalidatePath("/quan-ly-cong-viec");
  return { phan_tram_hoan_thanh: result.phan_tram_hoan_thanh };
}

/** Báo cáo % thủ công — chỉ khi việc không có checklist. QLCV-09: DINH_KY @100% bắt kết quả. */
export async function reportQlcvManualProgress(
  congViecId: string,
  phanTram: number,
  ketQua?: string | null,
) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await resolveQlcvListScope(supabase);
  const actorNhanSuId = await getActorNhanSuId();
  const pct = Math.min(100, Math.max(0, Math.round(Number(phanTram))));

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, trang_thai, is_active, nguoi_phu_trach_id, phan_tram_hoan_thanh, nguoi_tao_id, checklist, loai_cong_viec, han_hoan_thanh, is_qua_han",
    )
    .eq("id", congViecId)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  assertQlcvRowInListScope(
    {
      nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
      nguoi_tao_id: cur.nguoi_tao_id,
    },
    scope,
  );

  if (taskUsesQlcvChecklistForProgress(cur.checklist)) {
    throw new Error("Việc có checklist — cập nhật tiến độ qua checklist.");
  }

  const wf = qlcvWorkflowMaFromViewRow(cur);
  if (isDeXuatChoDuyet(wf)) throw new Error("Đề xuất chưa được phê duyệt.");
  if (isEligibleForNghiemThu({ ...cur, ...wf })) {
    throw new Error("Việc đang chờ nghiệm thu — không cập nhật tiến độ tại đây.");
  }
  const stClosedManual = normalizeQlcvTrangThaiToCanonical(wf.trang_thai);
  if (stClosedManual === "HOAN_THANH" || stClosedManual === "DA_HUY") {
    throw new Error("Phiếu đã đóng.");
  }

  const adminBypass = await hasRBACAdminSupervisionBypass();
  if (!adminBypass) {
    const isAssignee =
      Boolean(actorNhanSuId && cur.nguoi_phu_trach_id) &&
      String(actorNhanSuId) === String(cur.nguoi_phu_trach_id);
    if (!isAssignee) await verifyPermission("CONG_VIEC", "edit");
  }

  const stMoi = trangThaiCongViecSauBaoCaoTienDo(
    pct,
    wf.trang_thai,
    typeof cur.loai_cong_viec === "string" ? cur.loai_cong_viec : null,
  );

  const ketQuaNorm = String(ketQua ?? "").trim();
  if (stMoi === "HOAN_THANH" && isQlcvLoaiDinhKy(wf.loai_cong_viec) && !ketQuaNorm) {
    throw new Error("Việc định kỳ đóng khi đủ 100% — nhập một dòng kết quả.");
  }

  let result: { phan_tram_hoan_thanh: number };
  try {
    result = await persistProgressThenMaybeTransition(supabase, {
      congViecId,
      items: [],
      pct,
      stMoi,
      currentTrangThaiMa: wf.trang_thai ? String(wf.trang_thai) : null,
      actorNhanSuId,
      activityLyDo: stMoi === "HOAN_THANH" && ketQuaNorm ? `Kết quả: ${ketQuaNorm}` : undefined,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Không lưu được tiến độ.";
    throw new Error(formatQlcvDbError(msg));
  }

  const oldPct = Number(cur.phan_tram_hoan_thanh ?? 0);
  if (pct !== oldPct) {
    await appendQlcvNhatKy(supabase, {
      congViecId,
      loaiHoatDong: "BAO_CAO_TIEN_DO",
      nguoiThucHienId: actorNhanSuId,
      noiDung: `Báo cáo tiến độ ${pct}%`,
      phanTramHoanThanh: pct,
    });
  }
  if (stMoi === "HOAN_THANH") {
    await appendQlcvNhatKy(supabase, {
      congViecId,
      loaiHoatDong: "HOAN_THANH",
      nguoiThucHienId: actorNhanSuId,
      noiDung: ketQuaNorm
        ? `Kết quả: ${ketQuaNorm}`
        : "Hoàn thành — việc định kỳ đã báo đủ tiến độ.",
      trangThai: "HOAN_THANH",
      phanTramHoanThanh: pct,
    });
  }

  revalidatePath("/quan-ly-cong-viec");
  return { phan_tram_hoan_thanh: result.phan_tram_hoan_thanh };
}
