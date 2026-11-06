"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import { congViecSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";
import { applyQlcvListScopeToQuery, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { verifyQlcvApproveCapability } from "../lib/qlcv-rbac";
import { normalizeQlcvDmFields } from "../lib/qlcv-persist-dm-fields";
import {
  resolveQlcvDiaDiemKhoaIds,
  assertQlcvHanHoanThanhNotPast,
  assertQlcvHanHoanThanhChangeAllowed,
  insertQlcvTaskRow,
} from "../lib/qlcv-create-task";
import { assertQlcvActiveInvariant } from "../lib/qlcv-active-invariant";
import { QLCV_FACT_WRITE_TABLE } from "../lib/qlcv-fact-write";
import { throwQlcvDbError } from "../lib/qlcv-supabase-error";
import { resolveQlcvTrangThaiMaForTask } from "../lib/qlcv-initial-trang-thai";
import { isDeXuatChoDuyet, type CongViecLike } from "../lib/qlcv-workflow-display";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { validateAssigneeForQlcv } from "../lib/qlcv-ksnk-server";
import { invokeQlcvTransition } from "../lib/qlcv-transition-rpc";
import { appendQlcvNhatKy } from "../lib/qlcv-nhat-ky";
import { QLCV_ROOT_TASK_VIEW_SELECT } from "../lib/qlcv-root-list-select";

/** Lọc gần đúng pending đề xuất ở SQL; vẫn `isDeXuatChoDuyet` phía app (legacy alias). */
function applyPendingDeXuatSqlFilter<T extends { or: (f: string) => T }>(query: T): T {
  return query.or(
    "trang_thai.eq.DE_XUAT_CHO_DUYET,and(is_active.eq.false,trang_thai.eq.MOI),and(is_active.eq.false,trang_thai.eq.CHUA_BAT_DAU),and(is_active.eq.false,trang_thai.is.null)",
  );
}

interface CreateDeXuatInput {
  tieu_de: string;
  mo_ta?: string;
  han_hoan_thanh?: string;
  loai_cong_viec?: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "CAO" | "TRUNG_BINH" | "THAP";
  dia_diem_khoa_id?: string | null;
  dia_diem_khoa_ids?: string[] | null;
}

type DeXuatRow = CongViecLike & {
  nguoi_tao?: { ho_ten?: string | null } | null;
  nguoi_phu_trach?: { ho_ten?: string | null } | null;
  to_cong_tac?: { ten_to?: string | null } | null;
};

/**
 * Gửi đề xuất — cùng SSOT insert với tạo việc (`insertQlcvTaskRow`), is_active=false.
 */
export async function createDeXuat(input: CreateDeXuatInput) {
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("create");
  const actorNhanSuId = await getActorNhanSuId();
  if (!actorNhanSuId) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới gửi được đề xuất.");
  }

  const tieuDe = String(input.tieu_de ?? "").trim();
  if (!tieuDe) throw new Error("Nhập tiêu đề đề xuất.");

  assertQlcvHanHoanThanhNotPast(input.han_hoan_thanh);

  const loai = input.loai_cong_viec || "DOT_XUAT";
  if (loai === "DINH_KY") {
    throw new Error(
      "Không đề xuất loại định kỳ. Việc lặp theo chu kỳ quản lý ở tab Việc định kỳ (mẫu → sinh phiếu).",
    );
  }

  const data = await insertQlcvTaskRow(supabase, {
    tieu_de: tieuDe,
    mo_ta: input.mo_ta != null ? String(input.mo_ta).trim() || null : null,
    loai_cong_viec: loai,
    muc_do_uu_tien: input.muc_do_uu_tien,
    han_hoan_thanh: input.han_hoan_thanh || null,
    dia_diem_khoa_id: input.dia_diem_khoa_id,
    dia_diem_khoa_ids: input.dia_diem_khoa_ids,
    ksnkKhoaId: ksnkKhoaId,
    is_active: false,
    nguoi_tao_id: actorNhanSuId,
  });

  await appendQlcvNhatKy(supabase, {
    congViecId: String(data.id),
    loaiHoatDong: "DE_XUAT",
    nguoiThucHienId: actorNhanSuId,
    noiDung: "Gửi đề xuất công việc nội bộ KSNK",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

export async function pheDuyetDeXuat(id: string, duyet: boolean, lyDo?: string) {
  await verifyQlcvApproveCapability();
  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("approve");
  const actorNhanSuId = await getActorNhanSuId();

  const { data: row, error: fetchErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("tieu_de, nguoi_phu_trach_id, to_cong_tac_id, han_hoan_thanh, loai_cong_viec, is_active, trang_thai")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) throw new Error("Không tìm thấy đề xuất.");
  if (!isDeXuatChoDuyet(row)) {
    throw new Error("Công việc không ở trạng thái đề xuất chờ duyệt.");
  }

  if (duyet) {
    await validateAssigneeForQlcv(supabase, row.nguoi_phu_trach_id, ksnkKhoaId);
    assertQlcvActiveInvariant({
      tieu_de: row.tieu_de,
      nguoi_phu_trach_id: row.nguoi_phu_trach_id,
      han_hoan_thanh: row.han_hoan_thanh,
      loai_cong_viec: row.loai_cong_viec,
    });
    const trangThai = resolveQlcvTrangThaiMaForTask({
      isActive: true,
      nguoi_phu_trach_id: row.nguoi_phu_trach_id,
      to_cong_tac_id: row.to_cong_tac_id,
    });
    await invokeQlcvTransition(supabase, {
      congViecId: id,
      action: "PHE_DUYET_DEXUAT",
      actorNhanSuId: actorNhanSuId,
      patch: {
        trang_thai: trangThai,
        nguoi_giao_viec_id: actorNhanSuId,
        noi_dung_hoat_dong: "Đã phê duyệt đề xuất",
      },
    });
  } else {
    const reason = String(lyDo ?? "").trim();
    if (!reason) {
      throw new Error("Nhập lý do từ chối đề xuất.");
    }
    await invokeQlcvTransition(supabase, {
      congViecId: id,
      action: "TU_CHOI_DEXUAT",
      actorNhanSuId: actorNhanSuId,
      lyDo: reason,
    });
  }

  revalidatePath("/quan-ly-cong-viec");
}

export async function pheDuyetVaCapNhatDeXuat(id: string, payload: CongViecInput) {
  await verifyQlcvApproveCapability();
  const parsed = congViecSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { supabase, ksnkKhoaId } = await ensureQlcvKsnkAccess("approve");
  const actorNhanSuId = await getActorNhanSuId();
  const p = parsed.data;
  if (p.loai_cong_viec === "DINH_KY") {
    throw new Error("Đề xuất chỉ dùng việc đột xuất (không tạo từ mẫu định kỳ tại đây).");
  }

  const { data: cur, error: fetchErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("han_hoan_thanh, is_active, trang_thai")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !cur) throw new Error("Không tìm thấy đề xuất.");
  if (!isDeXuatChoDuyet(cur)) {
    throw new Error("Công việc không ở trạng thái đề xuất chờ duyệt.");
  }

  assertQlcvHanHoanThanhChangeAllowed(p.han_hoan_thanh, cur.han_hoan_thanh);
  await validateAssigneeForQlcv(supabase, p.nguoi_phu_trach_id, ksnkKhoaId);
  const khoaIds = await resolveQlcvDiaDiemKhoaIds(
    supabase,
    p.dia_diem_khoa_ids?.length ? p.dia_diem_khoa_ids : p.dia_diem_khoa_id ? [p.dia_diem_khoa_id] : [],
  );
  assertQlcvActiveInvariant({
    tieu_de: p.tieu_de,
    nguoi_phu_trach_id: p.nguoi_phu_trach_id,
    han_hoan_thanh: p.han_hoan_thanh,
    loai_cong_viec: p.loai_cong_viec,
  });

  const extraFields: Record<string, unknown> = {
    dia_diem_khoa_id: khoaIds[0] ?? null,
    dia_diem_khoa_ids: khoaIds,
  };
  if (p.nhiem_vu_id !== undefined) {
    const { resolveQlcvNhiemVuId } = await import("../lib/qlcv-nhiem-vu-chain");
    extraFields.nhiem_vu_id = await resolveQlcvNhiemVuId(supabase, p.nhiem_vu_id);
  }
  if (p.nhom_chuyen_mon_id !== undefined) {
    extraFields.nhom_chuyen_mon_id = p.nhom_chuyen_mon_id || null;
  }
  if (p.vi_tri_thuc_hien !== undefined) {
    extraFields.vi_tri_thuc_hien = p.vi_tri_thuc_hien?.trim() || null;
  }
  if (p.nguoi_phoi_hop_ids !== undefined) {
    const ids = p.nguoi_phoi_hop_ids ?? [];
    for (const sid of ids) await validateAssigneeForQlcv(supabase, sid, ksnkKhoaId);
    extraFields.nguoi_phoi_hop_ids = ids;
  }
  if (p.nguoi_theo_doi_ids !== undefined) {
    const ids = p.nguoi_theo_doi_ids ?? [];
    for (const sid of ids) await validateAssigneeForQlcv(supabase, sid, ksnkKhoaId);
    extraFields.nguoi_theo_doi_ids = ids;
  }

  const { error: locErr } = await supabase
    .from(QLCV_FACT_WRITE_TABLE)
    .update(extraFields)
    .eq("id", id);
  if (locErr) throwQlcvDbError(locErr, "Không lưu trường mở rộng khi phê duyệt.");

  const trangThai = resolveQlcvTrangThaiMaForTask({
    isActive: true,
    nguoi_phu_trach_id: p.nguoi_phu_trach_id,
    to_cong_tac_id: p.to_cong_tac_id,
  });
  const dmFk = normalizeQlcvDmFields({
    loai_cong_viec: p.loai_cong_viec,
    trang_thai: trangThai,
  });

  await invokeQlcvTransition(supabase, {
    congViecId: id,
    action: "PHE_DUYET_DEXUAT",
    actorNhanSuId: actorNhanSuId,
    patch: {
      trang_thai: dmFk.trang_thai,
      tieu_de: p.tieu_de,
      mo_ta: p.mo_ta ?? null,
      loai_cong_viec: dmFk.loai_cong_viec,
      muc_do_uu_tien: p.muc_do_uu_tien ?? "TRUNG_BINH",
      han_hoan_thanh: p.han_hoan_thanh ?? null,
      nguoi_phu_trach_id: p.nguoi_phu_trach_id ?? null,
      to_cong_tac_id: p.to_cong_tac_id ?? null,
      nguoi_giao_viec_id: actorNhanSuId,
      noi_dung_hoat_dong: "Phê duyệt đề xuất và giao nhiệm vụ KSNK",
    },
  });

  revalidatePath("/quan-ly-cong-viec");
}

export async function getPendingDeXuat() {
  await verifyQlcvApproveCapability();
  const { supabase } = await ensureQlcvKsnkAccess("approve");
  const scope = await resolveQlcvListScope(supabase);

  // A) select(*) + filter client. B) cột board + lọc SQL gần đúng — chọn B.
  const data = await fetchAllRangeRows<DeXuatRow>((from, to) => {
    let query = supabase
      .from("v_qlcv_cong_viec_full")
      .select(QLCV_ROOT_TASK_VIEW_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    query = applyPendingDeXuatSqlFilter(query);
    query = applyQlcvListScopeToQuery(query, scope);
    return query;
  });

  return data.filter((r) => isDeXuatChoDuyet(r));
}

export async function getMyPendingDeXuat() {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const actorNhanSuId = await getActorNhanSuId();
  if (!actorNhanSuId) return [];

  const scope = await resolveQlcvListScope(supabase);

  const data = await fetchAllRangeRows<DeXuatRow>((from, to) => {
    let query = supabase
      .from("v_qlcv_cong_viec_full")
      .select(QLCV_ROOT_TASK_VIEW_SELECT)
      .eq("nguoi_tao_id", actorNhanSuId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    query = applyPendingDeXuatSqlFilter(query);
    query = applyQlcvListScopeToQuery(query, scope);
    return query;
  });

  return data.filter((r) => isDeXuatChoDuyet(r));
}
