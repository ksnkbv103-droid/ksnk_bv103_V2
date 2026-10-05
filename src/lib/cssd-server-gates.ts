import { verifyPermission } from "@/lib/server-permission";

/** Gate CSSD dùng chung — `cssd-erp` và `cssd-su-co` import từ đây (tránh phụ thuộc chéo module). */

export async function verifyCssdWorkflowView(): Promise<void> {
  await verifyPermission("CSSD_WORKFLOW", "view");
}

export async function verifyCssdWorkflowEdit(): Promise<void> {
  await verifyPermission("CSSD_WORKFLOW", "edit");
}

export async function verifyCssdIncidentCreate(): Promise<void> {
  await verifyPermission("BAO_SU_CO", "create");
}

/**
 * SC-02/03 tạm: xác nhận / ra lệnh thu hồi = Trưởng CSSD|Admin (role)
 * hoặc Tổ trưởng mẻ (`CSSD_ME_TIET_KHUAN.qc`).
 */
export async function verifyCssdIncidentApprove(): Promise<void> {
  const { getActorRoleNames } = await import("@/lib/server-permission");
  const { canApproveCssdIncident } = await import(
    "@/modules/cssd-su-co/domain/cssd-incident-status"
  );
  const roles = await getActorRoleNames();
  if (canApproveCssdIncident(roles)) return;
  try {
    await verifyCssdBatchQc();
  } catch {
    throw new Error("Chỉ Trưởng CSSD / Admin / Tổ trưởng mẻ được xác nhận hoặc ra lệnh thu hồi.");
  }
}

/** In / đọc biên bản — create hoặc view BAO_SU_CO. */
export async function verifyCssdIncidentPrint(): Promise<void> {
  try {
    await verifyPermission("BAO_SU_CO", "create");
    return;
  } catch {
    await verifyPermission("BAO_SU_CO", "view");
  }
}

export async function verifyCssdMaintenanceView(): Promise<void> {
  try {
    await verifyPermission("THIET_BI", "view");
    return;
  } catch {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "view");
  }
}

export async function verifyCssdMaintenanceEdit(): Promise<void> {
  try {
    await verifyPermission("THIET_BI", "edit");
    return;
  } catch {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "edit");
  }
}

export async function verifyCssdInventoryEdit(): Promise<void> {
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");
}

export async function verifyCssdBatchView(): Promise<void> {
  await verifyPermission("CSSD_ME_TIET_KHUAN", "view");
}

export async function verifyCssdBatchEdit(): Promise<void> {
  await verifyPermission("CSSD_ME_TIET_KHUAN", "edit");
}

/** AB-6 A: tổ trưởng CSSD — Soft maps to RBAC `CSSD_ME_TIET_KHUAN.qc` (QC hơi nước / quyền cũ). */
export async function verifyCssdBatchQc(): Promise<void> {
  await verifyPermission("CSSD_ME_TIET_KHUAN", "qc");
}

/**
 * ME-04: nhả implant / nhả sau BI âm → `CSSD_ME_TIET_KHUAN.nha_implant`.
 * Khi permission chưa seed (migration chưa apply) → fallback `qc` (không khóa cứng NV).
 */
export async function verifyCssdBatchNhaImplant(): Promise<void> {
  const { createAdminSupabaseClient } = await import("@/lib/supabase-server");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("sys_permissions")
    .select("id")
    .eq("module_name", "CSSD_ME_TIET_KHUAN")
    .eq("action", "nha_implant")
    .maybeSingle();
  if (!error && data?.id) {
    await verifyPermission("CSSD_ME_TIET_KHUAN", "nha_implant");
    return;
  }
  await verifyCssdBatchQc();
}

export async function verifyCssdQrHubView(): Promise<void> {
  try {
    await verifyCssdWorkflowView();
    return;
  } catch {
    await verifyCssdBatchView();
  }
}

export async function verifyCssdReportView(): Promise<void> {
  await verifyPermission("CSSD_REPORT", "view");
}

export async function verifyCssdKhoDungCuView(): Promise<void> {
  await verifyPermission("CSSD_KHO_DUNGCU", "view");
}
