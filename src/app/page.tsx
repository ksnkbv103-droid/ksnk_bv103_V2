import { redirect } from "next/navigation";

/**
 * H2 (2026-09-17): Tổng quan sáp nhập vào Báo cáo chính thức.
 * `/` chỉ điều hướng — không còn Command Center «Việc hôm nay».
 */
export default function HomePage() {
  redirect("/bao-cao-tong-hop");
}
