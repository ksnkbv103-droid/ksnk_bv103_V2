"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { assertQlcvRowInListScope, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { verifyQlcvApproveCapability, verifyQlcvDeleteCapability, verifyQlcvNghiemThuCapability } from "../lib/qlcv-rbac";
import { congViecCreateSchema, parseCongViecUpdate, phanTramHoanThanhSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";
import { assigneeBlockedFromTaskCrud } from "../lib/qlcv-access";
import { isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { normalizeQlcvDmFields } from "../lib/qlcv-persist-dm-fields";
import { assertQlcvHanHoanThanhNotPast, assertQlcvHanHoanThanhChangeAllowed, assertQlcvDiaDiemKhoaValid, insertQlcvTaskRow, normalizeQlcvHanDate } from "../lib/qlcv-create-task";
import { assertQlcvActiveInvariant } from "../lib/qlcv-active-invariant";
import { resolveQlcvTrangThaiMaForTask } from "../lib/qlcv-initial-trang-thai";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { isQlcvLoaiDinhKy } from "@/lib/domain/qlcv/dinh-ky-auto-complete";
import { taskUsesQlcvChecklistForProgress } from "@/lib/domain/qlcv-checklist";
import { isEligibleForNghiemThu } from "@/lib/domain/qlcv/nghiem-thu-gate";
import { hasQlcvChecklistFullResult, normalizeQlcvKetQuaText, validateQlcvCloseRequiresResult } from "@/lib/domain/qlcv/close-requires-result";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { invokeQlcvTransition } from "../lib/qlcv-transition-rpc";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { validateAssigneeForQlcv } from "../lib/qlcv-ksnk-server";
import { appendQlcvNhatKy } from "../lib/qlcv-nhat-ky";

// ==================== CREATE ====================
export async function createCongViec(input: CongViecInput) {
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("create");
  const parsed = congViecCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).join(", "));
  }
  const payload = parsed.data;
  if (payload.loai_cong_viec === "DINH_KY") {
    throw new Error(
      "Không tạo việc định kỳ từ Điều hành. Vào tab Việc định kỳ để thêm mẫu — hệ thống sẽ sinh phiếu.",
    );
  }
  assertQlcvHanHoanThanhNotPast(payload.han_hoan_thanh);
  if (!payload.nguoi_phu_trach_id) {
    throw new Error("Chọn người phụ trách (nhân viên KSNK) trước khi tạo công việc.");
  }
  const actor = await getActorNhanSuId();
  if (!actor) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới tạo được công việc.");
  }

  const data = await insertQlcvTaskRow(supabase, {
    tieu_de: payload.tieu_de,
    mo_ta: payload.mo_ta,
    loai_cong_viec: payload.loai_cong_viec,
    muc_do_uu_tien: payload.muc_do_uu_tien,
    han_hoan_thanh: payload.han_hoan_thanh,
    nguoi_phu_trach_id: payload.nguoi_phu_trach_id,
    ksnkKhoaId: ksnkKhoaId,
    to_cong_tac_id: payload.to_cong_tac_id,
    vi_tri_thuc_hien: payload.vi_tri_thuc_hien,
    dia_diem_khoa_id: payload.dia_diem_khoa_id,
    nhiem_vu_id: payload.nhiem_vu_id,
    nguoi_phoi_hop_ids: payload.nguoi_phoi_hop_ids,
    nguoi_theo_doi_ids: payload.nguoi_theo_doi_ids,
    is_active: true,
    nguoi_tao_id: actor,
    nguoi_giao_viec_id: actor,
    analytics_meta: payload.analytics_meta ?? null,
    nguon_lien_ket: payload.nguon_lien_ket ?? null,
  });

  await appendQlcvNhatKy(supabase, {
    congViecId: String(data.id),
    loaiHoatDong: "PHAN_CONG",
    nguoiThucHienId: actor,
    noiDung: "Tạo công việc mới",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

// ==================== GET LIST (from View) ====================

type CongViecUpdateInput = Partial<CongViecInput> & {
  trang_thai?: string;
  phan_tram_hoan_thanh?: number;
};

// ==================== UPDATE ====================
export async function updateCongViec(id: string, rawUpdates: CongViecUpdateInput) {
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("edit");
  const shape = parseCongViecUpdate(rawUpdates as Record<string, unknown>);
  if (!shape.ok) throw new Error(shape.error);
  if (rawUpdates.phan_tram_hoan_thanh !== undefined) {
    const pct = phanTramHoanThanhSchema.safeParse(rawUpdates.phan_tram_hoan_thanh);
    if (!pct.success) throw new Error(pct.error.issues[0]?.message || "Tiến độ không hợp lệ.");
  }
  // Ghi đè các trường đã kiểm bằng giá trị đã chuẩn hóa (trim, rỗng → null); giữ trang_thai/% để action tự chặn.
  const updates: CongViecUpdateInput = { ...rawUpdates, ...shape.data };
  const adminBypass = await hasRBACAdminSupervisionBypass();
  const actor = await getActorNhanSuId();

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, tieu_de, trang_thai, is_active, nguoi_phu_trach_id, to_cong_tac_id, han_hoan_thanh, is_qua_han, phan_tram_hoan_thanh, nguoi_phu_trach_ten, nguoi_tao_id, nguoi_giao_viec_id, nhiem_vu_id, loai_cong_viec, checklist",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");
  const curMa = qlcvWorkflowMaFromViewRow(cur);

  if (!adminBypass) {
    await verifyPermission("CONG_VIEC", "edit");

    // Chặn thay đổi trạng thái trực tiếp qua updateCongViec
    if (updates.trang_thai !== undefined) {
      throw new Error("Không được phép cập nhật trực tiếp trạng thái công việc qua biểu mẫu sửa. Vui lòng sử dụng các nút thao tác chuyên biệt.");
    }

    if (assigneeBlockedFromTaskCrud(actor, { ...cur, trang_thai: curMa.trang_thai })) {
      throw new Error("Người phụ trách không được sửa nội dung công việc đã giao.");
    }

    const curForGate = {
      trang_thai: curMa.trang_thai,
      is_active: cur.is_active,
      nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
      phan_tram_hoan_thanh: cur.phan_tram_hoan_thanh,
      loai_cong_viec: curMa.loai_cong_viec,
      han_hoan_thanh: cur.han_hoan_thanh,
      is_qua_han: cur.is_qua_han,
    };
    if (isEligibleForNghiemThu(curForGate)) {
      const blockedAtNghiemThu = ["trang_thai", "phan_tram_hoan_thanh"] as const;
      const touchingBlocked = blockedAtNghiemThu.some((k) => updates[k] !== undefined);
      if (touchingBlocked) {
        throw new Error(
          "Việc đang chờ nghiệm thu — không đổi trạng thái hay % qua form sửa; dùng nghiệm thu, làm lại hoặc hủy không đạt (hoặc quản trị).",
        );
      }
    }

    const scope = await resolveQlcvListScope(supabase);
    assertQlcvRowInListScope(
      {
        nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
        nguoi_tao_id: cur.nguoi_tao_id,
      },
      scope,
    );
  }

  // Thu thập thông tin đổi metadata nhạy cảm để ghi log kiểm toán
  const auditLogs: {
    loai_hoat_dong: "PHAN_CONG" | "GIA_HAN" | "CAP_NHAT";
    noi_dung: string;
    trang_thai?: string;
  }[] = [];

  if (updates.han_hoan_thanh !== undefined) {
    const oldHan = normalizeQlcvHanDate(cur.han_hoan_thanh);
    const newHan = normalizeQlcvHanDate(updates.han_hoan_thanh);
    if (oldHan !== newHan) {
      assertQlcvHanHoanThanhChangeAllowed(newHan, oldHan);
      auditLogs.push({
        loai_hoat_dong: "GIA_HAN",
        noi_dung: `Thay đổi hạn hoàn thành từ ${oldHan || "chưa thiết lập"} sang ${newHan || "vô thời hạn"}.`,
      });
    }
  }

  if (updates.nguoi_phu_trach_id !== undefined && updates.nguoi_phu_trach_id !== cur.nguoi_phu_trach_id) {
    await validateAssigneeForQlcv(supabase, updates.nguoi_phu_trach_id, ksnkKhoaId);
    let tenNguoiMoi = "chưa gán";
    if (updates.nguoi_phu_trach_id) {
      const { data: staff } = await supabase
        .from("mdm_nhan_su")
        .select("ho_ten")
        .eq("id", updates.nguoi_phu_trach_id)
        .maybeSingle();
      if (staff) tenNguoiMoi = staff.ho_ten;
    }
    const tenNguoiCu = cur.nguoi_phu_trach_ten || "chưa gán";
    auditLogs.push({
      loai_hoat_dong: "PHAN_CONG",
      noi_dung: `Thay đổi người phụ trách từ ${tenNguoiCu} sang ${tenNguoiMoi}.`,
    });
  }

  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Sử dụng kiểm tra undefined để cho phép cập nhật null
  if (updates.tieu_de !== undefined) dbUpdates.tieu_de = updates.tieu_de;
  if (updates.mo_ta !== undefined) dbUpdates.mo_ta = updates.mo_ta;
  // QLCV-05: không đổi loại sau tạo (trừ legacy KHAN_CAP → DOT_XUAT).
  if (updates.loai_cong_viec !== undefined) {
    const nextLoai = String(updates.loai_cong_viec).toUpperCase();
    const curLoai = String(curMa.loai_cong_viec ?? "").toUpperCase();
    if (nextLoai === curLoai) {
      /* noop */
    } else if (curLoai === "KHAN_CAP" && nextLoai === "DOT_XUAT") {
      dbUpdates.loai_cong_viec = "DOT_XUAT";
    } else {
      throw new Error("Không được đổi loại công việc sau khi tạo.");
    }
  }
  if (updates.muc_do_uu_tien !== undefined) dbUpdates.muc_do_uu_tien = updates.muc_do_uu_tien;
  if (updates.han_hoan_thanh !== undefined) dbUpdates.han_hoan_thanh = updates.han_hoan_thanh;
  if (updates.nguoi_phu_trach_id !== undefined) dbUpdates.nguoi_phu_trach_id = updates.nguoi_phu_trach_id;
  if (updates.to_cong_tac_id !== undefined) dbUpdates.to_cong_tac_id = updates.to_cong_tac_id;
  if (updates.vi_tri_thuc_hien !== undefined) {
    dbUpdates.vi_tri_thuc_hien = updates.vi_tri_thuc_hien?.trim() || null;
  }
  if (updates.dia_diem_khoa_id !== undefined) {
    await assertQlcvDiaDiemKhoaValid(supabase, updates.dia_diem_khoa_id, false);
    dbUpdates.dia_diem_khoa_id = updates.dia_diem_khoa_id;
  }
  if (updates.nhiem_vu_id !== undefined) {
    const { resolveQlcvNhiemVuId } = await import("../lib/qlcv-nhiem-vu-chain");
    dbUpdates.nhiem_vu_id = await resolveQlcvNhiemVuId(supabase, updates.nhiem_vu_id);
  }
  if (updates.nguoi_phoi_hop_ids !== undefined) {
    const ids = updates.nguoi_phoi_hop_ids ?? [];
    for (const sid of ids) await validateAssigneeForQlcv(supabase, sid, ksnkKhoaId);
    dbUpdates.nguoi_phoi_hop_ids = ids;
  }
  if (updates.nguoi_theo_doi_ids !== undefined) {
    const ids = updates.nguoi_theo_doi_ids ?? [];
    for (const sid of ids) await validateAssigneeForQlcv(supabase, sid, ksnkKhoaId);
    dbUpdates.nguoi_theo_doi_ids = ids;
  }

  const nextPhuTrach = (updates.nguoi_phu_trach_id ?? cur.nguoi_phu_trach_id) as string | null;
  const nextTo = (updates.to_cong_tac_id ?? cur.to_cong_tac_id) as string | null | undefined;

  const curForDeXuat = {
    trang_thai: curMa.trang_thai,
    is_active: cur.is_active,
    nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
    phan_tram_hoan_thanh: cur.phan_tram_hoan_thanh,
  };
  const isProposalPending = isDeXuatChoDuyet(curForDeXuat);

  if (isProposalPending && nextPhuTrach) {
    await verifyQlcvApproveCapability();
    await validateAssigneeForQlcv(supabase, nextPhuTrach, ksnkKhoaId);
    const nextHan = (updates.han_hoan_thanh !== undefined
      ? updates.han_hoan_thanh
      : cur.han_hoan_thanh) as string | null;
    const nextTieu = (updates.tieu_de !== undefined ? updates.tieu_de : cur.tieu_de) as string;
    assertQlcvActiveInvariant({
      tieu_de: nextTieu,
      nguoi_phu_trach_id: nextPhuTrach,
      han_hoan_thanh: nextHan,
      loai_cong_viec: updates.loai_cong_viec ?? curMa.loai_cong_viec,
    });

    const trangThai = resolveQlcvTrangThaiMaForTask({
      isActive: true,
      nguoi_phu_trach_id: nextPhuTrach,
      to_cong_tac_id: nextTo,
    });
    const dmFk = normalizeQlcvDmFields({
      loai_cong_viec: updates.loai_cong_viec,
      trang_thai: trangThai,
    });

    const patch: Record<string, unknown> = {
      trang_thai: dmFk.trang_thai,
      nguoi_phu_trach_id: nextPhuTrach,
      to_cong_tac_id: nextTo ?? null,
      nguoi_giao_viec_id: actor,
      noi_dung_hoat_dong: "Phê duyệt đề xuất và giao nhiệm vụ KSNK",
    };
    if (updates.tieu_de !== undefined) patch.tieu_de = updates.tieu_de;
    if (updates.mo_ta !== undefined) patch.mo_ta = updates.mo_ta;
    if (updates.loai_cong_viec !== undefined) patch.loai_cong_viec = dmFk.loai_cong_viec;
    if (updates.muc_do_uu_tien !== undefined) patch.muc_do_uu_tien = updates.muc_do_uu_tien;
    if (updates.han_hoan_thanh !== undefined) patch.han_hoan_thanh = updates.han_hoan_thanh;
    if (updates.dia_diem_khoa_id !== undefined) patch.dia_diem_khoa_id = updates.dia_diem_khoa_id;
    if (updates.nhiem_vu_id !== undefined) patch.nhiem_vu_id = updates.nhiem_vu_id;

    await invokeQlcvTransition(supabase, {
      congViecId: id,
      action: "PHE_DUYET_DEXUAT",
      actorNhanSuId: actor,
      patch,
    });

    revalidatePath("/quan-ly-cong-viec");
    return { success: true, activated: true };
  }

  // QLCV-04: chặn xóa phụ trách / hạn trên phiếu active; chỉ DANG_LAM khi có phụ trách.
  if (cur.is_active) {
    const nextHanActive = (updates.han_hoan_thanh !== undefined
      ? updates.han_hoan_thanh
      : cur.han_hoan_thanh) as string | null;
    const nextTieuActive = (updates.tieu_de !== undefined ? updates.tieu_de : cur.tieu_de) as string;
    if (
      updates.han_hoan_thanh !== undefined ||
      updates.nguoi_phu_trach_id !== undefined ||
      updates.tieu_de !== undefined
    ) {
      assertQlcvActiveInvariant({
        tieu_de: nextTieuActive,
        nguoi_phu_trach_id: nextPhuTrach,
        han_hoan_thanh: nextHanActive,
        loai_cong_viec: updates.loai_cong_viec ?? curMa.loai_cong_viec,
      });
    }
  }

  if (cur.is_active && nextPhuTrach) {
    const st = normalizeQlcvTrangThaiToCanonical(curMa.trang_thai);
    if (st === "MOI") {
      const tt = normalizeQlcvDmFields({ trang_thai: "DANG_LAM" });
      dbUpdates.trang_thai = tt.trang_thai;
      // Q-08: đổi trạng thái phải để lại dấu vết trong nhật ký (đã có người phụ trách → bắt đầu làm).
      auditLogs.push({
        loai_hoat_dong: "CAP_NHAT",
        noi_dung: "Tự chuyển Mới → Đang làm khi đã có người phụ trách.",
        trang_thai: String(tt.trang_thai),
      });
    }
  }
  // QLCV-06: cấm ghi trang_thai qua form sửa (kể cả quản trị) — dùng adminSetTrangThaiCongViec.
  if (updates.trang_thai !== undefined) {
    throw new Error(
      "Không cập nhật trạng thái qua form sửa. Dùng nút thao tác hoặc chỉnh trạng thái có lý do (quản trị).",
    );
  }
  if (
    updates.phan_tram_hoan_thanh !== undefined &&
    !taskUsesQlcvChecklistForProgress(cur.checklist)
  ) {
    dbUpdates.phan_tram_hoan_thanh = updates.phan_tram_hoan_thanh;
  }

  const { data, error } = await supabase
    .from("qlcv_fact_cong_viec")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Lỗi cập nhật DB:", error);
    throw new Error(`Cập nhật thất bại: ${error.message}`);
  }

  for (const log of auditLogs) {
    await appendQlcvNhatKy(supabase, {
      congViecId: id,
      loaiHoatDong: log.loai_hoat_dong,
      nguoiThucHienId: actor,
      noiDung: log.noi_dung,
      trangThai: log.trang_thai ?? null,
      phanTramHoanThanh:
        updates.phan_tram_hoan_thanh !== undefined ? updates.phan_tram_hoan_thanh : (cur.phan_tram_hoan_thanh ?? 0),
    });
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true, data };
}

// ==================== XÁC NHẬN HOÀN THÀNH ====================
export async function xacNhanHoanThanh(id: string, ketQua?: string | null) {
  await verifyQlcvNghiemThuCapability();
  const { supabase } = await ensureQlcvKsnkAccess("approve");
  const actorNhanSuId = await getActorNhanSuId();
  const scope = await resolveQlcvListScope(supabase);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, trang_thai, phan_tram_hoan_thanh, nguoi_phu_trach_id, nguoi_tao_id, loai_cong_viec, han_hoan_thanh, is_qua_han, checklist",
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
  if (isQlcvLoaiDinhKy(wf.loai_cong_viec)) {
    throw new Error("Việc định kỳ đóng khi tick đủ — không nghiệm thu.");
  }
  if (wf.trang_thai === "HOAN_THANH" || wf.trang_thai === "DA_HUY") {
    throw new Error("Công việc đã hoàn thành hoặc đã hủy.");
  }
  if (!isEligibleForNghiemThu({ ...cur, ...wf })) {
    throw new Error("Chỉ nghiệm thu khi việc đã báo 100% (cổng chờ nghiệm thu).");
  }
  // N-QLCV-5 / QLCV-06: cấm tự nghiệm thu (trừ quản trị / Chủ nhiệm).
  if (
    actorNhanSuId &&
    cur.nguoi_phu_trach_id &&
    actorNhanSuId === cur.nguoi_phu_trach_id &&
    !(await hasRBACAdminSupervisionBypass())
  ) {
    throw new Error("Không được tự nghiệm thu việc mình phụ trách.");
  }

  // 19c TAC-3A: đóng việc bắt buộc 1 dòng kết quả (hoặc checklist 100%).
  const closeErr = validateQlcvCloseRequiresResult({
    checklist: cur.checklist,
    ketQuaText: ketQua,
  });
  if (closeErr) throw new Error(closeErr);

  const ketQuaNorm = normalizeQlcvKetQuaText(ketQua);
  const lyDoNt = ketQuaNorm
    ? `Kết quả: ${ketQuaNorm}`
    : hasQlcvChecklistFullResult(cur.checklist)
      ? "Đã nghiệm thu — checklist đủ."
      : "Đã nghiệm thu và đóng công việc.";

  await invokeQlcvTransition(supabase, {
    congViecId: id,
    action: "NGHIEM_THU",
    actorNhanSuId: actorNhanSuId,
    lyDo: lyDoNt,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}

/** Quản trị chỉnh trạng thái qua SET_TRANG_THAI — bắt lý do, ghi nhật ký (QLCV-06). */
export async function adminSetTrangThaiCongViec(
  id: string,
  nextTrangThai: string,
  lyDo: string,
) {
  const { verifyQlcvAdminStatusCapability } = await import("../lib/qlcv-rbac");
  await verifyQlcvAdminStatusCapability();
  const { supabase } = await ensureQlcvKsnkAccess("edit");
  const actorNhanSuId = await getActorNhanSuId();
  const reason = String(lyDo || "").trim();
  if (!reason) throw new Error("Nhập lý do khi chỉnh trạng thái.");

  const { data: cur, error: fetchErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("id, trang_thai, phan_tram_hoan_thanh")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  await invokeQlcvTransition(supabase, {
    congViecId: id,
    action: "SET_TRANG_THAI",
    actorNhanSuId: actorNhanSuId,
    lyDo: reason,
    patch: {
      next_trang_thai: nextTrangThai,
      current_trang_thai: cur.trang_thai,
      phan_tram_hoan_thanh: cur.phan_tram_hoan_thanh,
      loai_hoat_dong: "CAP_NHAT",
    },
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}

/** Trả việc về làm lại sau khi báo 100% (từ chối nghiệm thu). */
export async function tuChoiHoanThanhCongViec(id: string, lyDo: string) {
  await verifyQlcvNghiemThuCapability();
  const { supabase } = await ensureQlcvKsnkAccess("approve");
  const actorNhanSuId = await getActorNhanSuId();
  const scope = await resolveQlcvListScope(supabase);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, trang_thai, phan_tram_hoan_thanh, nguoi_phu_trach_id, nguoi_tao_id, loai_cong_viec, han_hoan_thanh, is_qua_han",
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
  if (isQlcvLoaiDinhKy(wf.loai_cong_viec)) {
    throw new Error("Việc định kỳ đóng khi tick đủ — không nghiệm thu.");
  }
  const pct = Number(cur.phan_tram_hoan_thanh ?? 0);
  if (!isEligibleForNghiemThu({ ...cur, ...wf })) {
    throw new Error("Công việc không ở trạng thái chờ nghiệm thu.");
  }

  await invokeQlcvTransition(supabase, {
    congViecId: id,
    action: "TU_CHOI_NGHIEM_THU",
    actorNhanSuId: actorNhanSuId,
    lyDo: lyDo,
    patch: { phan_tram_hoan_thanh: pct },
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}

// ==================== XÓA ====================
/** QLCV-07: chỉ đề xuất / phiếu trống; còn lại dùng Hủy. */
export async function deleteCongViec(id: string) {
  const { supabase } = await ensureQlcvKsnkAccess("delete");
  await verifyQlcvDeleteCapability();
  const scope = await resolveQlcvListScope(supabase);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      "id, trang_thai, is_active, nguoi_tao_id, nguoi_phu_trach_id, han_hoan_thanh, phan_tram_hoan_thanh, nhat_ky",
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

  const { assertQlcvHardDeleteAllowed } = await import("../lib/qlcv-hard-delete");
  assertQlcvHardDeleteAllowed(cur);

  const { error } = await supabase.from("qlcv_fact_cong_viec").delete().eq("id", id);

  if (error) {
    console.error("Lỗi xóa công việc:", error);
    throw new Error("Không thể xóa công việc này.");
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}
