"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { MdmCoverageRow, MdmFieldRegistryRow, MdmSuggestionRow } from "@/lib/master-data/governance";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export async function getMdmGovernanceSnapshot() {
  try {
    await verifyPermission("DANH_MUC", "view");
    const supabase = createAdminSupabaseClient();
    const [registryRes, suggestionRes, coverageRes] = await Promise.all([
      supabase
        .from("mdm_field_registry")
        .select("*")
        .eq("is_active", true)
        .order("table_name", { ascending: true })
        .order("column_name", { ascending: true }),
      supabase
        .from("mdm_governance_suggestion")
        .select("*")
        .eq("status", "OPEN")
        .order("confidence", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("mdm_field_registry")
        .select("table_name")
        .eq("is_active", true),
    ]);
    if (registryRes.error) throw registryRes.error;
    if (suggestionRes.error) throw suggestionRes.error;
    if (coverageRes.error) throw coverageRes.error;

    const coverageMap = new Map<string, number>();
    for (const row of (coverageRes.data || []) as Array<{ table_name?: string }>) {
      const tableName = String(row.table_name || "").trim();
      if (!tableName) continue;
      coverageMap.set(tableName, (coverageMap.get(tableName) || 0) + 1);
    }
    const coverage: MdmCoverageRow[] = Array.from(coverageMap.entries())
      .map(([table_name, registered_fields]) => ({
        table_name,
        total_candidate_fields: registered_fields,
        registered_fields,
        missing_fields: 0,
      }))
      .sort((a, b) => b.registered_fields - a.registered_fields || a.table_name.localeCompare(b.table_name));

    return {
      success: true as const,
      data: {
        registry: (registryRes.data || []) as MdmFieldRegistryRow[],
        suggestions: (suggestionRes.data || []) as MdmSuggestionRow[],
        coverage,
      },
    };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function refreshMdmGovernanceSuggestions() {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("mdm_refresh_governance_suggestions");
    if (error) throw error;
    return { success: true as const, data };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
