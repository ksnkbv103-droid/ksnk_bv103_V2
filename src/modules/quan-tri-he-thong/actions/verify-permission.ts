"use server";

import { verifyPermission as verifySharedPermission } from "@/lib/server-permission";

export async function verifyPermission(moduleKey: string, action: string) {
  return verifySharedPermission(moduleKey, action);
}
