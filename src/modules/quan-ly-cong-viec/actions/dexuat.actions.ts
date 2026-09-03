"use server";

import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { congViecSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";
import { applyQlcvListScopeToQuery, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { verifyQlcvApproveCapability } from "../lib/qlcv-rbac";
import { normalizeQlcvDmFields } from "../lib/qlcv-persist-dm-fields";
import {
  assertQlcvDiaDiemKhoaValid,
  assertQlcvHanHoanThanhNotPast,
  assertQlcvHanHoanThanhChangeAllowed,
  insertQlcvTaskRow,
} from "../lib/qlcv-create-task";
import { QLCV_FACT_WRITE_TABLE } from "../lib/qlcv-fact-write";
import { throwQlcvDbError } from "../lib/qlcv-supabase-error";
import { resolveQlcvTrangThaiMaForTask } from "../lib/qlcv-initial-trang-thai";
import { isDeXuatChoDuyet, type CongViecLike } from "../lib/qlcv-workflow-display";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { validateAssigneeForQlcv } from "../lib/qlcv-ksnk-server";
import { invokeQlcvTransition } from "../lib/qlcv-transition-rpc";
import { appendQlcvNhatKy } from "../lib/qlcv-nhat-ky";

interface CreateDeXuatInput {
  tieu_de: string;
  mo_ta?: string;
  han_hoan_thanh?: string;
  loai_cong_viec?: "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
  muc_do_uu_tien?: "CAO" | "TRUNG_BINH" | "THAP";
  dia_diem_khoa_id: string;
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
  const { supabase } = await ensureQlcvKsnkAccess("approve");
  const actorNhanSuId = await getActorNhanSuId();

  const { data: row, error: fetchErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("nguoi_phu_trach_id, to_cong_tac_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) throw new Error("Không tìm thấy đề xuất.");

  if (duyet) {
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
    await invokeQlcvTransition(supabase, {
      congViecId: id,
      action: "TU_CHOI_DEXUAT",
      actorNhanSuId: actorNhanSuId,
      lyDo: lyDo,
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

  const { data: cur, error: fetchErr } = await supabase
    .from("qlcv_fact_cong_viec")
    .select("han_hoan_thanh")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !cur) throw new Error("Không tìm thấy đề xuất.");

  assertQlcvHanHoanThanhChangeAllowed(p.han_hoan_thanh, cur.han_hoan_thanh);
  await validateAssigneeForQlcv(supabase, p.nguoi_phu_trach_id, ksnkKhoaId);
  await assertQlcvDiaDiemKhoaValid(supabase, p.dia_diem_khoa_id, true);

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

  const { error: locErr } = await supabase
    .from(QLCV_FACT_WRITE_TABLE)
    .update({ dia_diem_khoa_id: p.dia_diem_khoa_id })
    .eq("id", id);
  if (locErr) throwQlcvDbError(locErr, "Không ghi địa điểm khoa khi phê duyệt.");

  revalidatePath("/quan-ly-cong-viec");
}

export async function getPendingDeXuat() {
  await verifyQlcvApproveCapability();
  const { supabase } = await ensureQlcvKsnkAccess("approve");
  const scope = await resolveQlcvListScope(supabase);

  let query = supabase
    .from("v_qlcv_cong_viec_full")
    .select(
      `
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten),
      nguoi_phu_trach:mdm_nhan_su!nguoi_phu_trach_id(ho_ten),
      to_cong_tac:mdm_dm_to_cong_tac!to_cong_tac_id(ten_to)
    `,
    )
    .eq("is_active", false)
    .order("created_at", { ascending: false });

  query = applyQlcvListScopeToQuery(query, scope);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return ((data || []) as DeXuatRow[]).filter((r) => isDeXuatChoDuyet(r));
}

export async function getMyPendingDeXuat() {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const actorNhanSuId = await getActorNhanSuId();
  if (!actorNhanSuId) return [];

  const scope = await resolveQlcvListScope(supabase);

  let query = supabase
    .from("v_qlcv_cong_viec_full")
    .select("*")
    .eq("is_active", false)
    .eq("nguoi_tao_id", actorNhanSuId)
    .order("created_at", { ascending: false });

  query = applyQlcvListScopeToQuery(query, scope);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data || []).filter((r) => isDeXuatChoDuyet(r));
}
