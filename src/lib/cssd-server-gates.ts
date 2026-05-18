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

export async function verifyCssdMaintenanceView(): Promise<void> {
  await verifyPermission("CSSD_ME_TIET_KHUAN", "view");
}

export async function verifyCssdMaintenanceEdit(): Promise<void> {
  await verifyPermission("CSSD_ME_TIET_KHUAN", "edit");
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
