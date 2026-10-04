"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { markCssdUsedClinically } from "../application/mark-used-clinically.application";
import type { CssdUsedClinicallySource } from "../domain/cssd-used-clinically";

async function resolveActorLabel(): Promise<string> {
  const uc = await createServerSupabaseUserClient();
  const { data } = await uc.auth.getUser();
  const id = String(data.user?.id || "").trim();
  const email = String(data.user?.email || "").trim();
  if (id) return id;
  if (email) return email;
  throw new Error("Không xác định được người thực hiện (actor).");
}

/** Event A: ghi nhận used_clinically (actor + timestamp). */
export async function markCssdUsedClinicallyAction(input: {
  quyTrinhId: string;
  source: CssdUsedClinicallySource;
  maCaMoId?: string | null;
  clear?: boolean;
}) {
  try {
    await verifyCssdWorkflowView();
    const actor = await resolveActorLabel();
    const supabase = createAdminSupabaseClient();
    const res = await markCssdUsedClinically(supabase, {
      quyTrinhId: input.quyTrinhId,
      actor,
      source: input.source,
      maCaMoId: input.maCaMoId,
      clear: input.clear === true,
    });
    return { success: true as const, ...res };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
