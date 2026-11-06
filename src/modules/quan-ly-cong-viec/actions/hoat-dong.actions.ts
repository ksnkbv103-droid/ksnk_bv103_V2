"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { hasRBACAdminSupervisionBypass, verifyPermission } from "@/lib/server-permission";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { isEligibleForNghiemThu } from "@/lib/domain/qlcv/nghiem-thu-gate";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { assertQlcvRowInListScope, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { appendQlcvNhatKy } from "../lib/qlcv-nhat-ky";
import { normalizeQlcvStaffIdList } from "../lib/qlcv-staff-ids";

interface CreateHoatDongInput {
  id_cong_viec: string;
  /** QLCV-09: chỉ ghi chú / báo tiến độ — không nhận loại «duyệt». */
  loai_hoat_dong: "BAO_CAO_TIEN_DO" | "CAP_NHAT";
  noi_dung?: string;
}

/**
 * Ghi nhận hoạt động / ghi chú tiến độ (không đổi % — checklist là SSOT tiến độ).
 */
export async function createHoatDong(input: CreateHoatDongInput) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await resolveQlcvListScope(supabase);
  const actorNhanSuId = await getActorNhanSuId();

  if (input.loai_hoat_dong !== "BAO_CAO_TIEN_DO" && input.loai_hoat_dong !== "CAP_NHAT") {
    throw new Error("Loại hoạt động không hợp lệ — chỉ ghi chú hoặc báo cáo tiến độ.");
  }

  const { data: task, error: te } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, nguoi_phu_trach_id, trang_thai, is_active, phan_tram_hoan_thanh, nguoi_tao_id, loai_cong_viec, han_hoan_thanh, is_qua_han, nguoi_phoi_hop_ids, nguoi_theo_doi_ids, nguoi_giao_viec_id",
    )
    .eq("id", input.id_cong_viec)
    .maybeSingle();

  if (te || !task) throw new Error("Không tìm thấy công việc.");

  assertQlcvRowInListScope(
    {
      nguoi_phu_trach_id: task.nguoi_phu_trach_id,
      nguoi_tao_id: task.nguoi_tao_id,
    },
    scope,
  );

  const wf = qlcvWorkflowMaFromViewRow(task);

  if (isDeXuatChoDuyet(wf)) throw new Error("Đề xuất chưa được phê duyệt.");
  const stClosed = normalizeQlcvTrangThaiToCanonical(wf.trang_thai);
  if (stClosed === "HOAN_THANH" || stClosed === "DA_HUY") {
    throw new Error("Phiếu đã đóng.");
  }

  if (input.loai_hoat_dong === "BAO_CAO_TIEN_DO") {
    if (isEligibleForNghiemThu({ ...task, ...wf })) {
      throw new Error("Việc đang chờ nghiệm thu — không ghi chú tiến độ tại đây.");
    }
  }

  const adminBypass = await hasRBACAdminSupervisionBypass();
  if (!adminBypass) {
    const isAssignee =
      Boolean(actorNhanSuId && task.nguoi_phu_trach_id) &&
      String(actorNhanSuId) === String(task.nguoi_phu_trach_id);
    const isCollaborator = Boolean(
      actorNhanSuId &&
      normalizeQlcvStaffIdList(task.nguoi_phoi_hop_ids).includes(String(actorNhanSuId)),
    );
    const isSupervisor = Boolean(
      actorNhanSuId &&
      normalizeQlcvStaffIdList(task.nguoi_theo_doi_ids).includes(String(actorNhanSuId)),
    );
    const isAssigner = Boolean(
      actorNhanSuId &&
      (String(actorNhanSuId) === String(task.nguoi_giao_viec_id) || String(actorNhanSuId) === String(task.nguoi_tao_id)),
    );
    const st = normalizeQlcvTrangThaiToCanonical(wf.trang_thai);
    const validState =
      st === "DANG_LAM" ||
      st === "TU_CHOI" ||
      st === "QUA_HAN" ||
      (st === "MOI" && Boolean(task.nguoi_phu_trach_id));

    const participantMayNote = (isAssignee || isCollaborator || isSupervisor || isAssigner) && validState;

    if (!participantMayNote) {
      await verifyPermission("CONG_VIEC", "edit");
    }
  }

  const cleanNoiDung = String(input.noi_dung ?? "").trim();
  if (!cleanNoiDung) {
    throw new Error("Nhập nội dung hoạt động / ghi chú.");
  }

  const snapshotPct = Number(task.phan_tram_hoan_thanh ?? 0);

  const hoatDong = await appendQlcvNhatKy(supabase, {
    congViecId: input.id_cong_viec,
    loaiHoatDong: input.loai_hoat_dong,
    nguoiThucHienId: actorNhanSuId,
    noiDung: cleanNoiDung,
    phanTramHoanThanh: snapshotPct,
  });

  revalidatePath("/quan-ly-cong-viec");
  return hoatDong;
}
