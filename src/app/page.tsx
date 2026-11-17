import { redirect } from "next/navigation";
import { resolvePilotSafeEntryPath } from "@/lib/ksnk-pilot-route-scope";
import { verifyBaoCaoTongHopShell } from "@/modules/dashboard/lib/dashboard-command-center-access";

/**
 * H2 (2026-09-17): Tổng quan sáp nhập vào Báo cáo chính thức.
 * `/` chỉ điều hướng — không còn Command Center «Việc hôm nay».
 * Khi pilot bật: tránh 404 (BCTH bị chặn dưới core).
 * QT-013: vai không đủ quyền BCTH (Mạng lưới/NV KSNK) → /giam-sat thay vì trang báo lỗi quyền.
 */
export default async function HomePage() {
  const entry = resolvePilotSafeEntryPath();
  if (entry === "/bao-cao-tong-hop") {
    let allowed = true;
    try {
      await verifyBaoCaoTongHopShell();
    } catch {
      allowed = false;
    }
    if (!allowed) redirect("/giam-sat");
  }
  redirect(entry);
}
