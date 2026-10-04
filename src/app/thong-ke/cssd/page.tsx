import { redirect } from "next/navigation";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";

/**
 * Mirror `/thong-ke/cssd` → SSOT **Báo cáo CSSD** tại `/cssd-erp/report` (tránh hai báo cáo lệch nhãn).
 * Query `from`/`to`/`tab`/`station` được giữ khi redirect.
 */
export default async function ThongKeCssdPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const tabRaw = String(pick("tab") || "volume").trim();
  // W3A flat doors + legacy aliases; unknown → volume
  const ALLOWED = new Set([
    "volume",
    "sets",
    "equipment",
    "staff",
    "incident",
    "overview",
    "accountability",
  ]);
  const tab = (ALLOWED.has(tabRaw) ? tabRaw : "volume") as
    | "volume"
    | "sets"
    | "equipment"
    | "staff"
    | "incident"
    | "overview"
    | "accountability";
  redirect(
    cssdReportAnalyticsHref({
      tab,
      from: pick("from") || pick("tu_ngay"),
      to: pick("to") || pick("den_ngay"),
      station: pick("station"),
    }),
  );
}
