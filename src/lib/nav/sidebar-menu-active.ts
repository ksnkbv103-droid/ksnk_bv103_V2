import { isGiamSatNavPath } from "@/lib/nav/giam-sat-write-dest";

/** Sidebar active state — `/cssd-erp/*` sáng mục Quy trình (IA-05). */
export function menuItemIsActive(pathname: string, href: string, urlTab: string | null): boolean {
  const [path, query] = href.split("?");
  if (path === "/quan-tri-he-thong" && (pathname === "/quan-tri-he-thong" || pathname.startsWith("/quan-tri-he-thong/"))) {
    return true;
  }
  if (
    path === "/giam-sat" ||
    path.startsWith("/giam-sat-vst") ||
    path.startsWith("/giam-sat-chung") ||
    path.startsWith("/giam-sat-nkbv")
  ) {
    return isGiamSatNavPath(pathname);
  }
  if (path === "/cssd-quy-trinh" && (pathname === "/cssd-erp" || pathname.startsWith("/cssd-erp/"))) {
    return true;
  }
  if (pathname !== path) return false;
  if (!query) return urlTab !== "dm_registry";
  const want = new URLSearchParams(query).get("tab");
  return want != null && want === urlTab;
}
