"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { type CssdQrTargetType } from "../shared/domain/cssd-qr-core";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { verifyCssdQrHubView } from "@/lib/cssd-server-gates";
import { getErrorMessage, mapFkError } from "./cssd-action-common";

type ResolveCssdCodeResult =
  | { success: true; targetType: CssdQrTargetType; code: string; machineId?: string; machineCode?: string; workflowId?: string }
  | { success: false; error: string };

async function verifyCanResolveCssdCode(): Promise<void> {
  await verifyCssdQrHubView();
}

export async function resolveCssdCodeAction(rawCode: string): Promise<ResolveCssdCodeResult> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanResolveCssdCode();
    const resolved = await resolveCssdCodeWithClient(supabase, rawCode);
    return { success: true, ...resolved };
  } catch (e: unknown) {
    return { success: false, error: mapFkError(getErrorMessage(e)) };
  }
}
