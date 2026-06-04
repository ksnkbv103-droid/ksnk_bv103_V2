import type { SupabaseClient } from "@supabase/supabase-js";

export type SupervisionLockModule = "VST" | "GSC";

export type SupervisionModuleLockStatus = {
  module: SupervisionLockModule;
  lockedUntilDate: string | null;
  isLockedForDate: (ngayGiamSat: string | null | undefined) => boolean;
  lockMessage: string | null;
};

const LOCK_VI =
  "Dữ liệu giám sát đã bị khóa cứng để chốt báo cáo thi đua. Không cho phép ghi hoặc sửa phiên có ngày giám sát trong khoảng đã khóa.";

function parseNgay(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function fetchSupervisionModuleLock(
  supabase: SupabaseClient,
  module: SupervisionLockModule,
): Promise<SupervisionModuleLockStatus> {
  const { data, error } = await supabase
    .from("sys_module_locks")
    .select("locked_until_date")
    .eq("module_name", module)
    .maybeSingle();
  if (error) throw error;

  const lockedUntilDate = data?.locked_until_date
    ? String(data.locked_until_date).slice(0, 10)
    : null;

  return {
    module,
    lockedUntilDate,
    isLockedForDate(ngayGiamSat) {
      const ngay = parseNgay(ngayGiamSat);
      if (!lockedUntilDate || !ngay) return false;
      return ngay <= lockedUntilDate;
    },
    lockMessage: lockedUntilDate
      ? `${LOCK_VI} (khóa đến ${lockedUntilDate}, module ${module}).`
      : null,
  };
}

export async function assertSupervisionNotLockedForDate(
  supabase: SupabaseClient,
  module: SupervisionLockModule,
  ngayGiamSat: string | null | undefined,
): Promise<void> {
  const lock = await fetchSupervisionModuleLock(supabase, module);
  if (lock.isLockedForDate(ngayGiamSat)) {
    throw new Error(lock.lockMessage ?? LOCK_VI);
  }
}
