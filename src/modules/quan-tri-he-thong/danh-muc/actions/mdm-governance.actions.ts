"use server";

/**
 * MDM Governance actions.
 *
 * SSOT bảng vật lý sau đợt rename 25/05/2026:
 * - `mdm_field_registry`        → SSOT `sys_mdm_registry`        (`docs/core/implementation-mapping.md`)
 * - `mdm_governance_suggestion` → SSOT `sys_mdm_suggestion`
 *
 * Tham chiếu trực tiếp tên SSOT để bỏ qua chuỗi view 2 tầng (`mdm_*` → `sys_*`).
 *
 * Slice 4 follow-up (26/05/2026):
 * - Chuyển sang `createServerSupabaseUserClient()` để RLS đính trong migration
 *   `20260526000005_rls_admin_core_tables.sql` (+ `_000006`) kick in trên
 *   `sys_mdm_registry` / `sys_mdm_suggestion`. Policy yêu cầu PHAN_QUYEN(DANH_MUC) hoặc ADMIN.
 *   `verifyPermission("DANH_MUC", "view|edit")` là layer first-defense; RLS là defense-in-depth.
 * - RPC `mdm_refresh_governance_suggestions` (VOLATILE, không SECURITY DEFINER) chạy bằng
 *   role user → vẫn tôn trọng RLS bên trong RPC.
 */

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { MdmCoverageRow, MdmFieldRegistryRow, MdmSuggestionRow } from "@/lib/master-data/governance";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export async function getMdmGovernanceSnapshot() {
  try {
    await verifyPermission("DANH_MUC", "view");
    const supabase = await createServerSupabaseUserClient();
    const [registryRes, suggestionRes, coverageRes] = await Promise.all([
      supabase
        .from("sys_mdm_registry")
        .select("*")
        .eq("is_active", true)
        .order("table_name", { ascending: true })
        .order("column_name", { ascending: true }),
      supabase
        .from("sys_mdm_suggestion")
        .select("*")
        .eq("status", "OPEN")
        .order("confidence", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("sys_mdm_registry")
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
    const supabase = await createServerSupabaseUserClient();
    const { data, error } = await supabase.rpc("mdm_refresh_governance_suggestions");
    if (error) throw error;
    return { success: true as const, data };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function approveMdmSuggestionAction(
  suggestionId: string,
  payload: {
    table_name: string;
    column_name: string;
    field_role: MdmFieldRegistryRow["field_role"];
    source_table: string;
    source_column: string;
    source_loai_danh_muc: string;
    is_required: boolean;
    notes?: string;
  }
) {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const supabase = await createServerSupabaseUserClient();
    
    // 1. Insert into sys_mdm_registry
    const { data: regData, error: regError } = await supabase
      .from("sys_mdm_registry")
      .insert([
        {
          table_name: payload.table_name,
          column_name: payload.column_name,
          field_role: payload.field_role,
          source_table: payload.source_table || "sys_lookup_value",
          source_column: payload.source_column || "id",
          source_loai_danh_muc: payload.source_loai_danh_muc || null,
          is_required: payload.is_required || false,
          is_active: true,
          notes: payload.notes || "Phê duyệt tự động từ Gợi ý MDM",
          suggestion_policy: "MANUAL_REVIEW"
        }
      ])
      .select()
      .single();
      
    if (regError) throw regError;

    // 2. Mark the suggestion as APPROVED
    const { error: sugError } = await supabase
      .from("sys_mdm_suggestion")
      .update({ status: "APPROVED" })
      .eq("id", suggestionId);

    if (sugError) throw sugError;

    return { success: true as const, data: regData };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function rejectMdmSuggestionAction(suggestionId: string) {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const supabase = await createServerSupabaseUserClient();
    
    const { error } = await supabase
      .from("sys_mdm_suggestion")
      .update({ status: "REJECTED" })
      .eq("id", suggestionId);

    if (error) throw error;
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function toggleRegistryFieldAction(registryId: string, isActive: boolean) {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const supabase = await createServerSupabaseUserClient();
    
    const { error } = await supabase
      .from("sys_mdm_registry")
      .update({ is_active: isActive })
      .eq("id", registryId);

    if (error) throw error;
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function deleteRegistryRowAction(registryId: string) {
  try {
    await verifyPermission("DANH_MUC", "edit");
    const supabase = await createServerSupabaseUserClient();
    
    // Set active to false first to safely trigger attachment removal trigger in Postgres
    const { error: toggleError } = await supabase
      .from("sys_mdm_registry")
      .update({ is_active: false })
      .eq("id", registryId);
      
    if (toggleError) throw toggleError;
    
    // Now physically delete it from the registry
    const { error: deleteError } = await supabase
      .from("sys_mdm_registry")
      .delete()
      .eq("id", registryId);

    if (deleteError) throw deleteError;
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
