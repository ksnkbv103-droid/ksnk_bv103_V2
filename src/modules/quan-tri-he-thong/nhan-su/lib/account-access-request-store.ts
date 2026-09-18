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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function decideAccessRequestRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function lookupAccessRequestFromTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function countPendingAccessRequests(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<number | null> {
  const available = await isAccountAccessRequestTableAvailable(supabase);
  if (!available) return null;
  const { count, error } = await supabase
    .from("sys_account_access_request")
    .select("id", { count: "exact", head: true })
    .eq("status", "CHO_DUYET");
  if (error) {
    if (isMissingTableError(error)) tableAvailableCache = false;
    return null;
  }
  return count ?? 0;
}
