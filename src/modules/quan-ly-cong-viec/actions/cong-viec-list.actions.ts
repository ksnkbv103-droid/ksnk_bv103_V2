"use server";

/** Danh sách, bảng điều hành và chi tiết công việc (đọc). Ghi / chuyển trạng thái ở `cong-viec.actions.ts`. */
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { applyQlcvListScopeToQuery, assertQlcvRowInListScope, resolveQlcvListScope } from "../lib/qlcv-list-scope";
import { verifyQlcvApproveCapability } from "../lib/qlcv-rbac";
import { QLCV_BOARD_FETCH_MAX_PAGES, QLCV_BOARD_FETCH_PAGE_SIZE } from "../lib/qlcv-query-limits";
import { QLCV_BOARD_TASK_VIEW_SELECT, QLCV_ROOT_TASK_VIEW_SELECT } from "../lib/qlcv-root-list-select";
import type { QlcvBoardFilter } from "../lib/qlcv-board-filter";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { enrichQlcvNhatKyForTimeline, parseQlcvNhatKy } from "../lib/qlcv-nhat-ky";
import { getPendingDeXuat } from "./dexuat.actions";

async function fetchAllActiveRootTasksInScope(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  scope: Awaited<ReturnType<typeof resolveQlcvListScope>>,
  opts?: { boardFilter?: QlcvBoardFilter | null; actorStaffId?: string | null },
) {
  const rows: Record<string, unknown>[] = [];
  const actor = opts?.actorStaffId ? String(opts.actorStaffId) : "";
  const lens = opts?.boardFilter ?? null;

  for (let page = 0; page < QLCV_BOARD_FETCH_MAX_PAGES; page++) {
    const from = page * QLCV_BOARD_FETCH_PAGE_SIZE;
    const to = from + QLCV_BOARD_FETCH_PAGE_SIZE - 1;

    let query = supabase
      .from("v_qlcv_cong_viec_full")
      .select(QLCV_BOARD_TASK_VIEW_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    query = applyQlcvListScopeToQuery(query, scope);

    // A) Dump full board rồi filter client. B) Lọc SQL theo lens mặc định — chọn B.
    if (lens === "MY_TASKS" && actor) {
      query = query
        .eq("nguoi_phu_trach_id", actor)
        .not("trang_thai", "in", "(HOAN_THANH,DA_HUY)");
    } else if (lens === "IN_PROGRESS") {
      query = query.eq("trang_thai", "DANG_LAM");
    } else if (lens === "OVERDUE") {
      query = query.eq("is_qua_han", true).not("trang_thai", "in", "(HOAN_THANH,DA_HUY)");
    }

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

/** Việc active trong phạm vi — Kanban (cắt cột + lọc SQL theo lens). */
export async function getCongViecListForBoard(opts?: {
  boardFilter?: QlcvBoardFilter | null;
  actorStaffId?: string | null;
}) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await resolveQlcvListScope(supabase);
  return fetchAllActiveRootTasksInScope(supabase, scope, opts);
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
    to_cong_tac_id: p.to_cong_tac_id ?? null,
    is_active: false,
    created_at: p.created_at,
    updated_at: p.updated_at,
    nguoi_tao_ten: p.nguoi_tao_ten ?? null,
    nguoi_phu_trach_ten: p.nguoi_phu_trach_ten ?? null,
    nguoi_giao_ten: p.nguoi_giao_ten ?? null,
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
  const { supabase } = await ensureQlcvKsnkAccess("view");
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


// ==================== GET DETAIL ====================
export async function getCongViecDetail(id: string) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await resolveQlcvListScope(supabase);

  const { data, error } = await supabase
    .from("v_qlcv_cong_viec_full")
    .select(`
      *,
      nguoi_tao:mdm_nhan_su!nguoi_tao_id(ho_ten),
      nguoi_phu_trach:mdm_nhan_su!nguoi_phu_trach_id(ho_ten, is_active),
      nguoi_giao:mdm_nhan_su!nguoi_giao_viec_id(ho_ten),
      to_cong_tac:mdm_dm_to_cong_tac!to_cong_tac_id(ten_to)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Lỗi lấy chi tiết công việc:", error);
    throw new Error("Không thể tải chi tiết công việc: " + error.message);
  }

  assertQlcvRowInListScope(
    {
      nguoi_phu_trach_id: data.nguoi_phu_trach_id,
      nguoi_tao_id: data.nguoi_tao_id,
    },
    scope,
  );

  const nhatKy = parseQlcvNhatKy(data.nhat_ky);
  const hoat_dong = await enrichQlcvNhatKyForTimeline(supabase, nhatKy);

  return { ...data, hoat_dong };
}
