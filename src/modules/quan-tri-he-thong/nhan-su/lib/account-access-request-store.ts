import type { SupabaseClient } from "@supabase/supabase-js";
/**
 * Prefer sys_account_access_request when migration applied; fall back to soft extra_data.
 * Probe once per process; dual-write soft so Nhân sự pending filter keeps working.
 */
import type { AccountRequestKind, AccountRequestStatus } from "./account-access-request";

export type AccessRequestRow = {
  id: string;
  kind: AccountRequestKind;
  status: AccountRequestStatus;
  payload: Record<string, unknown>;
  staff_id: string | null;
  email: string;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
  reject_reason: string | null;
};

let tableAvailableCache: boolean | null = null;

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = String(error.message || "");
  const code = String(error.code || "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg) ||
    /schema cache/i.test(msg)
  );
}

/** Probe whether public.sys_account_access_request is queryable. */
export async function isAccountAccessRequestTableAvailable(
   
  supabase: any,
): Promise<boolean> {
  if (tableAvailableCache != null) return tableAvailableCache;
  try {
    const { error } = await supabase.from("sys_account_access_request").select("id").limit(1);
    if (isMissingTableError(error)) {
      tableAvailableCache = false;
      return false;
    }
    if (error) {
      console.warn("[sys_account_access_request] probe error:", error.message);
      return false;
    }
    tableAvailableCache = true;
    return true;
  } catch (e) {
    console.warn("[sys_account_access_request] probe threw:", e);
    return false;
  }
}

/** Test helper — reset probe cache. */
export function __resetAccountAccessRequestTableCache() {
  tableAvailableCache = null;
}

export async function insertAccessRequestRow(
   
  supabase: any,
  input: {
    kind: AccountRequestKind;
    email: string;
    staff_id?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<string | null> {
  const available = await isAccountAccessRequestTableAvailable(supabase);
  if (!available) return null;
  const { data, error } = await supabase
    .from("sys_account_access_request")
    .insert({
      kind: input.kind,
      status: "CHO_DUYET",
      email: input.email,
      staff_id: input.staff_id ?? null,
      payload: input.payload ?? {},
    })
    .select("id")
    .single();
  if (error) {
    if (isMissingTableError(error)) {
      tableAvailableCache = false;
      return null;
    }
    console.error("[sys_account_access_request] insert failed:", error);
    return null;
  }
  return (data?.id as string) || null;
}

/** Xóa phiếu vừa tạo khi ghi hồ sơ thất bại — tránh cooldown chặn lần gửi lại. */
/**
 * Hoàn tác phiếu vừa tạo khi ghi hồ sơ lỗi (không phải xóa nghiệp vụ). Không ném lỗi để lỗi gốc
 * được trả về, nhưng ghi log để phát hiện phiếu mồ côi.
 */
export async function discardAccessRequestRow(
  supabase: SupabaseClient,
  ticketId: string | null,
): Promise<void> {
  if (!ticketId) return;
  try {
    const { error } = await supabase.from("sys_account_access_request").delete().eq("id", ticketId);
    if (error) throw error;
  } catch (e) {
    console.error("[account-access-request] discard ticket failed", {
      module: "nhan-su",
      action: "discardAccessRequestRow",
      ticketId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function decideAccessRequestRow(
   
  supabase: any,
  params: {
    ticketId?: string | null;
    staffId?: string | null;
    email?: string | null;
    status: "DUYET" | "TU_CHOI";
    decidedBy: string;
    rejectReason?: string | null;
  },
): Promise<void> {
  const available = await isAccountAccessRequestTableAvailable(supabase);
  if (!available) return;

  const patch: Record<string, unknown> = {
    status: params.status,
    decided_by: params.decidedBy,
    decided_at: new Date().toISOString(),
  };
  if (params.status === "TU_CHOI") {
    patch.reject_reason = params.rejectReason || null;
  }

  if (params.ticketId) {
    await supabase.from("sys_account_access_request").update(patch).eq("id", params.ticketId);
    return;
  }

  let q = supabase.from("sys_account_access_request").update(patch).eq("status", "CHO_DUYET");
  if (params.staffId) q = q.eq("staff_id", params.staffId);
  else if (params.email) q = q.eq("email", params.email);
  else return;
  await q;
}

/** Cooldown bền theo dòng phiếu, không theo bộ nhớ process. */
export async function hasRecentAccessRequest(
   
  supabase: any,
  email: string,
  windowMs: number,
): Promise<boolean> {
  const available = await isAccountAccessRequestTableAvailable(supabase);
  if (!available) return false;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("sys_account_access_request")
    .select("id")
    .eq("email", email)
    .gte("created_at", since)
    .limit(1);
  if (error) {
    if (isMissingTableError(error)) tableAvailableCache = false;
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

export async function lookupAccessRequestFromTable(
   
  supabase: any,
  email: string,
  maNv?: string,
): Promise<{
  status: AccountRequestStatus;
  kind: AccountRequestKind;
  reject_reason: string | null;
  submitted_at: string | null;
  ticket_id: string | null;
} | null> {
  const available = await isAccountAccessRequestTableAvailable(supabase);
  if (!available) return null;

  const { data, error } = await supabase
    .from("sys_account_access_request")
    .select("id, kind, status, reject_reason, created_at, payload, staff_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    if (isMissingTableError(error)) tableAvailableCache = false;
    return null;
  }

  type Row = {
    id?: string;
    kind: string;
    status: string;
    reject_reason: string | null;
    created_at: string;
    payload: Record<string, unknown> | null;
    staff_id: string | null;
  };
  let rows = data as Row[];
  if (maNv) {
    const filtered = rows.filter((r) => {
      const pMa = String(r.payload?.ma_nv || "").trim();
      return !pMa || pMa.toUpperCase() === maNv.toUpperCase();
    });
    if (filtered.length) rows = filtered;
  }
  const top = rows[0];
  if (!top) return null;
  const kind = (String(top.kind || "REQUEST").toUpperCase() === "RESET" ? "RESET" : "REQUEST") as AccountRequestKind;
  const status = String(top.status || "").toUpperCase() as AccountRequestStatus;
  if (!["CHO_DUYET", "DUYET", "TU_CHOI"].includes(status)) return null;
  return {
    status,
    kind,
    reject_reason: top.reject_reason,
    submitted_at: top.created_at,
    ticket_id: String(top.id || "").trim() || null,
  };
}


function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** ACC-1: đếm phiếu theo email / mã NV / hồ sơ (trong cửa sổ thời gian hoặc chỉ phiếu chờ). Lỗi → 0. */
export async function countAccessRequests(
  supabase: any,
  filter: { email?: string; maNv?: string; staffId?: string; sinceMs?: number; pendingOnly?: boolean },
): Promise<number> {
  if (!filter.email && !filter.maNv && !filter.staffId) return 0;
  if (!(await isAccountAccessRequestTableAvailable(supabase))) return 0;
  let q = supabase.from("sys_account_access_request").select("id", { count: "exact", head: true });
  if (filter.email) q = q.eq("email", filter.email);
  if (filter.maNv) q = q.ilike("payload->>ma_nv", escapeLike(filter.maNv));
  if (filter.staffId) q = q.eq("staff_id", filter.staffId);
  if (filter.pendingOnly) q = q.eq("status", "CHO_DUYET");
  if (filter.sinceMs) q = q.gte("created_at", new Date(Date.now() - filter.sinceMs).toISOString());
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

/** ACC-1: đọc một phiếu theo id (admin duyệt / từ chối). */
export async function getAccessRequestTicket(supabase: any, id: string): Promise<AccessRequestRow | null> {
  if (!id || !(await isAccountAccessRequestTableAvailable(supabase))) return null;
  const { data, error } = await supabase
    .from("sys_account_access_request")
    .select("id, kind, status, payload, staff_id, email, created_at, decided_by, decided_at, reject_reason")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AccessRequestRow;
}

/** ACC-1: trang phiếu chờ duyệt; null khi bảng chưa có (dùng nhánh cũ). */
export async function listPendingAccessRequestTickets(
  supabase: any,
  params: { start: number; end: number; search?: string },
): Promise<{ rows: AccessRequestRow[]; total: number } | null> {
  if (!(await isAccountAccessRequestTableAvailable(supabase))) return null;
  let q = supabase
    .from("sys_account_access_request")
    .select("id, kind, status, payload, staff_id, email, created_at, decided_by, decided_at, reject_reason", {
      count: "exact",
    })
    .eq("status", "CHO_DUYET");
  const term = String(params.search || "").replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
  if (term) {
    q = q.or(`email.ilike.%${term}%,payload->>ho_ten.ilike.%${term}%,payload->>ma_nv.ilike.%${term}%`);
  }
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(params.start, params.end);
  if (error) throw error;
  return { rows: (data || []) as AccessRequestRow[], total: count ?? 0 };
}
