"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import {
  applyQlcvListScopeToQuery,
  assertQlcvRowInListScope,
  resolveQlcvListScope,
} from "../lib/qlcv-list-scope";
import {
  verifyQlcvApproveCapability,
  verifyQlcvDeleteCapability,
  verifyQlcvNghiemThuCapability,
} from "../lib/qlcv-rbac";
import { congViecSchema, type CongViecInput } from "@/lib/validations/quan-ly-cong-viec.validations";
import {
  assigneeBlockedFromTaskCrud,
  isQlcvTaskInQuaHanLane,
} from "../lib/qlcv-access";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { normalizeQlcvDmFields } from "../lib/qlcv-persist-dm-fields";
import { assertQlcvHanHoanThanhNotPast, insertQlcvTaskRow } from "../lib/qlcv-create-task";
import { resolveQlcvTrangThaiMaForTask } from "../lib/qlcv-initial-trang-thai";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { QLCV_BOARD_FETCH_MAX_PAGES, QLCV_BOARD_FETCH_PAGE_SIZE } from "../lib/qlcv-query-limits";
import { QLCV_ROOT_TASK_VIEW_SELECT } from "../lib/qlcv-root-list-select";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { getPendingDeXuat } from "./dexuat.actions";

// ==================== CREATE ====================
export async function createCongViec(input: CongViecInput) {
  await verifyPermission("CONG_VIEC", "create");
  const parsed = congViecSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Dữ liệu không hợp lệ: " + parsed.error.issues.map((i) => i.message).join(", "));
  }
  const payload = parsed.data;
  assertQlcvHanHoanThanhNotPast(payload.han_hoan_thanh);
  if (!payload.nguoi_phu_trach_id) {
    throw new Error("Chọn người phụ trách trước khi tạo công việc.");
  }
  const actor = await getActorNhanSuId();
  if (!actor) {
    throw new Error("Tài khoản cần gắn hồ sơ nhân sự (mdm_nhan_su) mới tạo được công việc.");
  }
  const supabase = createAdminSupabaseClient();

  const data = await insertQlcvTaskRow(supabase, {
    tieu_de: payload.tieu_de,
    mo_ta: payload.mo_ta,
    loai_cong_viec: payload.loai_cong_viec,
    muc_do_uu_tien: payload.muc_do_uu_tien,
    han_hoan_thanh: payload.han_hoan_thanh,
    nguoi_phu_trach_id: payload.nguoi_phu_trach_id,
    khoa_thuc_hien_id: payload.khoa_thuc_hien_id,
    to_cong_tac_id: payload.to_cong_tac_id,
    is_active: true,
    nguoi_tao_id: actor,
    nguoi_giao_viec_id: actor,
  });

  // Ghi log hoạt động
  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: String(data.id),
    loai_hoat_dong: "PHAN_CONG",
    nguoi_thuc_hien_id: actor,
    noi_dung: "Tạo công việc mới",
  });

  revalidatePath("/quan-ly-cong-viec");
  return data;
}

// ==================== GET LIST (from View) ====================

async function fetchAllActiveRootTasksInScope(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  scope: Awaited<ReturnType<typeof resolveQlcvListScope>>,
) {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < QLCV_BOARD_FETCH_MAX_PAGES; page++) {
    const from = page * QLCV_BOARD_FETCH_PAGE_SIZE;
    const to = from + QLCV_BOARD_FETCH_PAGE_SIZE - 1;

    let query = supabase
      .from("v_qlcv_cong_viec_full")
      .select(QLCV_ROOT_TASK_VIEW_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    query = applyQlcvListScopeToQuery(query, scope);

    const { data, error } = await query;
    if (error) {
      console.error("Lỗi lấy danh sách công việc (board):", error);
      throw new Error(`Không thể tải danh sách công việc: ${error.message}`);
    }

    const batch = data ?? [];
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < QLCV_BOARD_FETCH_PAGE_SIZE) break;
  }
  return rows;
}

/** Toàn bộ việc active trong phạm vi — dùng Kanban + thẻ cổng (fetch phân trang). */
export async function getCongViecListForBoard() {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const scope = await resolveQlcvListScope(supabase);
  return fetchAllActiveRootTasksInScope(supabase, scope);
}

export async function getCongViecList() {
  return getCongViecListForBoard();
}

/** Chuẩn hóa dòng đề xuất (fact inactive) về cùng hình dạng view danh sách gốc. */
function mapProposalToRootListRow(p: Record<string, unknown>) {
  return {
    id: p.id,
    tieu_de: p.tieu_de,
    mo_ta: p.mo_ta ?? null,
    loai_cong_viec: p.loai_cong_viec,
    muc_do_uu_tien: p.muc_do_uu_tien,
    trang_thai: p.trang_thai,
    han_hoan_thanh: p.han_hoan_thanh,
    phan_tram_hoan_thanh: p.phan_tram_hoan_thanh ?? 0,
    nguoi_tao_id: p.nguoi_tao_id,
    nguoi_giao_viec_id: p.nguoi_giao_viec_id ?? null,
    nguoi_phu_trach_id: p.nguoi_phu_trach_id ?? null,
    khoa_thuc_hien_id: p.khoa_thuc_hien_id ?? null,
    to_cong_tac_id: p.to_cong_tac_id ?? null,
    is_active: false,
    created_at: p.created_at,
    updated_at: p.updated_at,
    nguoi_tao_ten: p.nguoi_tao_ten ?? null,
    nguoi_phu_trach_ten: p.nguoi_phu_trach_ten ?? null,
    nguoi_giao_ten: p.nguoi_giao_ten ?? null,
    khoa_thuc_hien_ten: null,
    to_cong_tac_ten: p.to_cong_tac_ten ?? null,
    is_qua_han: false,
  };
}

function proposalMatchesTableSearch(p: Record<string, unknown>, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const hay = (v: unknown) => String(v ?? "").toLowerCase();
  return (
    hay(p.tieu_de).includes(q) ||
    hay(p.nguoi_tao_ten).includes(q) ||
    hay(p.trang_thai).includes(q) ||
    hay(p.nguoi_phu_trach_ten).includes(q)
  );
}

/** Danh sách gốc phân trang server (tab Bảng) — không cap cứng Kanban. */
export async function getCongViecListPaginated(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  /** Gộp đề xuất chờ duyệt (cùng `qlcv_fact_cong_viec`, is_active=false) vào trang 1…n theo thứ tự ảo: đề xuất trước, rồi việc đã kích hoạt. */
  includePendingProposals?: boolean;
}) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const scope = await resolveQlcvListScope(supabase);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, params.pageSize ?? 20));

  const rawSort = String(params.sortKey || "").trim();
  const allowedSortCols = new Set([
    "created_at",
    "tieu_de",
    "muc_do_uu_tien",
    "trang_thai",
    "han_hoan_thanh",
    "phan_tram_hoan_thanh",
    "nguoi_phu_trach_ten",
  ]);
  const sortCol = allowedSortCols.has(rawSort) ? rawSort : "created_at";
  const ascending = params.sortDir === "asc";

  const searchFilter = buildSupabaseSearchFilter(params.search, [
    "tieu_de",
    "nguoi_phu_trach_ten",
    "trang_thai",
  ]);

  const activeCountQuery = () => {
    let q = supabase
      .from("v_qlcv_cong_viec_full")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    q = applyQlcvListScopeToQuery(q, scope, searchFilter);
    return q;
  };

  const activeRowsQuery = () => {
    let q = supabase
      .from("v_qlcv_cong_viec_full")
      .select(QLCV_ROOT_TASK_VIEW_SELECT)
      .eq("is_active", true)
      .order(sortCol, { ascending });
    q = applyQlcvListScopeToQuery(q, scope, searchFilter);
    return q;
  };

  if (!params.includePendingProposals) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let dataQ = supabase
      .from("v_qlcv_cong_viec_full")
      .select(QLCV_ROOT_TASK_VIEW_SELECT, { count: "exact" })
      .eq("is_active", true)
      .order(sortCol, { ascending })
      .range(from, to);
    dataQ = applyQlcvListScopeToQuery(dataQ, scope, searchFilter);
    const { data, error, count } = await dataQ;
    if (error) {
      console.error("Lỗi lấy danh sách công việc (phân trang):", error);
      throw new Error(`Không thể tải danh sách công việc: ${error.message}`);
    }
    return {
      rows: data || [],
      totalCount: count ?? 0,
      page,
      pageSize,
    };
  }

  await verifyQlcvApproveCapability();
  const proposalsRaw = await getPendingDeXuat();
  const searchTrim = String(params.search || "").trim();
  const proposals = proposalsRaw
    .map((x) => mapProposalToRootListRow(x as Record<string, unknown>))
    .filter((row) => proposalMatchesTableSearch(row as Record<string, unknown>, searchTrim));
  const pLen = proposals.length;

  const { count: activeCount, error: cErr } = await activeCountQuery();
  if (cErr) {
    console.error("Lỗi đếm danh sách công việc:", cErr);
    throw new Error(`Không thể tải danh sách công việc: ${cErr.message}`);
  }
  const aCount = activeCount ?? 0;
  const totalCount = aCount + pLen;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  let rows: Record<string, unknown>[] = [];

  if (end <= pLen) {
    rows = proposals.slice(start, end) as Record<string, unknown>[];
  } else if (start >= pLen) {
    const aStart = start - pLen;
    const { data, error } = await activeRowsQuery().range(aStart, aStart + pageSize - 1);
    if (error) {
      console.error("Lỗi lấy danh sách công việc (phân trang + đề xuất):", error);
      throw new Error(`Không thể tải danh sách công việc: ${error.message}`);
    }
    rows = (data || []) as Record<string, unknown>[];
  } else {
    const propPart = proposals.slice(start, pLen) as Record<string, unknown>[];
    const need = pageSize - propPart.length;
    const { data, error } = await activeRowsQuery().range(0, Math.max(0, need - 1));
    if (error) {
      console.error("Lỗi lấy danh sách công việc (phân trang + đề xuất):", error);
      throw new Error(`Không thể tải danh sách công việc: ${error.message}`);
    }
    rows = [...propPart, ...((data || []) as Record<string, unknown>[])];
  }

  return {
    rows,
    totalCount,
    page,
    pageSize,
  };
}

type CongViecUpdateInput = Partial<CongViecInput> & {
  trang_thai?: string;
  phan_tram_hoan_thanh?: number;
};

// ==================== UPDATE ====================
export async function updateCongViec(id: string, updates: CongViecUpdateInput) {
  const supabase = createAdminSupabaseClient();
  const adminBypass = await hasRBACAdminSupervisionBypass();
  const actor = await getActorNhanSuId();

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, trang_thai, is_active, nguoi_phu_trach_id, to_cong_tac_id, han_hoan_thanh, phan_tram_hoan_thanh, nguoi_phu_trach_ten, nguoi_tao_id, nguoi_giao_viec_id, khoa_thuc_hien_id")
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
    };
    if (isChoNghiemThuHoanThanh(curForGate)) {
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
        khoa_thuc_hien_id: cur.khoa_thuc_hien_id,
        nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
        nguoi_tao_id: cur.nguoi_tao_id,
      },
      scope,
    );
  }

  // Thu thập thông tin đổi metadata nhạy cảm để ghi log kiểm toán
  const auditLogs: { loai_hoat_dong: "PHAN_CONG" | "GIA_HAN" | "CAP_NHAT"; noi_dung: string }[] = [];

  if (updates.han_hoan_thanh !== undefined) {
    const oldHan = cur.han_hoan_thanh ? new Date(cur.han_hoan_thanh).toISOString().split("T")[0] : null;
    const newHan = updates.han_hoan_thanh ? new Date(updates.han_hoan_thanh).toISOString().split("T")[0] : null;
    if (oldHan !== newHan) {
      if (newHan) {
        const todayStr = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
        if (newHan < todayStr) {
          throw new Error("Hạn hoàn thành mới không được trước ngày hôm nay.");
        }
      }
      auditLogs.push({
        loai_hoat_dong: "GIA_HAN",
        noi_dung: `Thay đổi hạn hoàn thành từ ${oldHan || "chưa thiết lập"} sang ${newHan || "vô thời hạn"}.`,
      });
    }
  }

  if (updates.nguoi_phu_trach_id !== undefined && updates.nguoi_phu_trach_id !== cur.nguoi_phu_trach_id) {
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
  if (updates.loai_cong_viec !== undefined) {
    const loai = normalizeQlcvDmFields({ loai_cong_viec: updates.loai_cong_viec });
    dbUpdates.loai_cong_viec = loai.loai_cong_viec;
  }
  if (updates.muc_do_uu_tien !== undefined) dbUpdates.muc_do_uu_tien = updates.muc_do_uu_tien;
  if (updates.han_hoan_thanh !== undefined) dbUpdates.han_hoan_thanh = updates.han_hoan_thanh;
  if (updates.nguoi_phu_trach_id !== undefined) dbUpdates.nguoi_phu_trach_id = updates.nguoi_phu_trach_id;
  if (updates.khoa_thuc_hien_id !== undefined) dbUpdates.khoa_thuc_hien_id = updates.khoa_thuc_hien_id;
  if (updates.to_cong_tac_id !== undefined) dbUpdates.to_cong_tac_id = updates.to_cong_tac_id;

  const nextPhuTrach = (updates.nguoi_phu_trach_id ?? cur.nguoi_phu_trach_id) as string | null;
  const nextTo = (updates.to_cong_tac_id ?? cur.to_cong_tac_id) as string | null | undefined;
  if (cur.is_active && (nextPhuTrach || nextTo)) {
    const st = curMa.trang_thai;
    if (st === "MOI" || st === "CHUA_BAT_DAU" || st === "CHO_NHAN_VIEC") {
      const tt = normalizeQlcvDmFields({ trang_thai: "DANG_LAM" });
      dbUpdates.trang_thai = tt.trang_thai;
    }
  }
  if (updates.trang_thai !== undefined) {
    const tt = normalizeQlcvDmFields({ trang_thai: updates.trang_thai });
    dbUpdates.trang_thai = tt.trang_thai;
  }
  if (updates.phan_tram_hoan_thanh !== undefined) dbUpdates.phan_tram_hoan_thanh = updates.phan_tram_hoan_thanh;

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

  // Ghi các log kiểm toán đã thu thập
  for (const log of auditLogs) {
    await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
      id_cong_viec: id,
      loai_hoat_dong: log.loai_hoat_dong,
      nguoi_thuc_hien_id: actor,
      noi_dung: log.noi_dung,
      phan_tram_hoan_thanh: updates.phan_tram_hoan_thanh !== undefined ? updates.phan_tram_hoan_thanh : (cur.phan_tram_hoan_thanh ?? 0),
    });
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true, data };
}

// ==================== GET DETAIL ====================
export async function getCongViecDetail(id: string) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const scope = await resolveQlcvListScope(supabase);

  const { data, error } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(`
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten),
      nguoi_phu_trach:mdm_nhan_su!nguoi_phu_trach_id(ho_ten),
      nguoi_giao:mdm_nhan_su!nguoi_giao_viec_id(ho_ten),
      khoa:mdm_dm_khoa_phong!khoa_thuc_hien_id(ten_khoa),
      to_cong_tac:mdm_dm_to_cong_tac!to_cong_tac_id(ten_to),
      hoat_dong:qlcv_fact_cong_viec_hoat_dong(
        *,
        nguoi:mdm_nhan_su!nguoi_thuc_hien_id(ho_ten)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Lỗi lấy chi tiết công việc:", error);
    throw new Error("Không thể tải chi tiết công việc: " + error.message);
  }

  assertQlcvRowInListScope(
    {
      khoa_thuc_hien_id: data.khoa_thuc_hien_id,
      nguoi_phu_trach_id: data.nguoi_phu_trach_id,
      nguoi_tao_id: data.nguoi_tao_id,
    },
    scope,
  );

  return data;
}

// ==================== XÁC NHẬN HOÀN THÀNH ====================
export async function xacNhanHoanThanh(id: string) {
  await verifyQlcvNghiemThuCapability();
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, trang_thai, phan_tram_hoan_thanh")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const st = qlcvWorkflowMaFromViewRow(cur).trang_thai;
  const canClose = st !== "HOAN_THANH" && st !== "DA_HUY";
  if (!canClose) {
    throw new Error("Công việc đã hoàn thành hoặc đã hủy.");
  }

  const { data: updated, error } = await supabase
    .from("qlcv_fact_cong_viec")
    .update({
      trang_thai: "HOAN_THANH",
      phan_tram_hoan_thanh: 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("trang_thai", cur.trang_thai as string)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Lỗi xác nhận hoàn thành:", error);
    throw new Error("Không thể xác nhận hoàn thành công việc.");
  }
  if (!updated) {
    throw new Error("Trạng thái công việc đã thay đổi hoặc đã bị xóa.");
  }

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "HOAN_THANH",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Đã nghiệm thu và đóng công việc.",
    phan_tram_hoan_thanh: 100,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}

/** Trả việc về làm lại sau khi báo 100% (từ chối nghiệm thu). */
export async function tuChoiHoanThanhCongViec(id: string, lyDo: string) {
  await verifyQlcvNghiemThuCapability();
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, trang_thai, phan_tram_hoan_thanh")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const st = qlcvWorkflowMaFromViewRow(cur).trang_thai;
  const pct = Number(cur.phan_tram_hoan_thanh ?? 0);
  const canReject =
    st === "CHO_DUYET" ||
    st === "CHO_XAC_NHAN_HOAN_THANH" ||
    ((st === "DANG_LAM" || st === "DANG_THUC_HIEN") && pct >= 100);

  if (!canReject) throw new Error("Công việc không ở trạng thái chờ nghiệm thu.");

  const { data: updated, error } = await supabase
    .from("qlcv_fact_cong_viec")
    .update({
      trang_thai: "TU_CHOI",
      // Giữ nguyên % hiện tại — không reset cứng về 90%;
      // người phụ trách sẽ tự cập nhật qua báo cáo tiến độ mới.
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("trang_thai", cur.trang_thai as string)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) throw new Error("Công việc không ở trạng thái chờ nghiệm thu.");

  await supabase.from("qlcv_fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    // Dùng TU_CHOI_HOAN_THANH để phân biệt với CAP_NHAT thông thường
    loai_hoat_dong: "TU_CHOI_HOAN_THANH",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: `Nghiệm thu không đạt — trả làm lại: ${lyDo}`,
    phan_tram_hoan_thanh: pct,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}

// ==================== XÓA ====================
/**
 * - Quản trị (ADMIN / email tin cậy): xóa được mọi trạng thái (trừ khi policy khác).
 * - HOAN_THANH: cần quyền CONG_VIEC delete (hoặc admin).
 * - Khác: chỉ người tạo/đề xuất trong phạm vi an toàn, hoặc quyền CONG_VIEC delete.
 * - Người phụ trách sau khi đã giao: không được xóa.
 */
export async function deleteCongViec(id: string) {
  const supabase = createAdminSupabaseClient();
  await verifyPermission("CONG_VIEC", "view");
  await verifyQlcvDeleteCapability();
  const scope = await resolveQlcvListScope(supabase);

  const { data: cur, error: fetchErr } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select("id, trang_thai, is_active, nguoi_tao_id, nguoi_phu_trach_id, khoa_thuc_hien_id, han_hoan_thanh, phan_tram_hoan_thanh")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  assertQlcvRowInListScope(
    {
      khoa_thuc_hien_id: cur.khoa_thuc_hien_id,
      nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
      nguoi_tao_id: cur.nguoi_tao_id,
    },
    scope,
  );

  const { error } = await supabase.from("qlcv_fact_cong_viec").delete().eq("id", id);

  if (error) {
    console.error("Lỗi xóa công việc:", error);
    throw new Error("Không thể xóa công việc này.");
  }

  revalidatePath("/quan-ly-cong-viec");
  return { success: true };
}
