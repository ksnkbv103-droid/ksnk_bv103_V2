"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchSupervisionModuleLock } from "@/lib/supervision-module-lock";

export async function getVstModuleLockStatus(ngayGiamSat?: string | null) {
  await verifyPermission("GIAM_SAT_VST", "view");
  const supabase = await createServerSupabaseUserClient();
  const lock = await fetchSupervisionModuleLock(supabase, "VST");
  const ngay = String(ngayGiamSat ?? "").trim().slice(0, 10) || null;
  return {
    success: true as const,
    lockedUntilDate: lock.lockedUntilDate,
    isLockedForSelectedDate: lock.isLockedForDate(ngay),
    lockMessage: lock.lockMessage,
  };
}
