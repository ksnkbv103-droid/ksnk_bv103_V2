import { redirect } from "next/navigation";
import { resolvePilotSafeEntryPath } from "@/lib/ksnk-pilot-route-scope";

/**
 * H2 (2026-09-17): Tổng quan sáp nhập vào Báo cáo chính thức.
 * `/` chỉ điều hướng — không còn Command Center «Việc hôm nay».
 * Khi pilot bật: tránh 404 (BCTH bị chặn dưới core).
 */
export default function HomePage() {
  redirect(resolvePilotSafeEntryPath());
}
