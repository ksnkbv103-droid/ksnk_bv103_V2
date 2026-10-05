// src/app/cssd-erp/report/page.tsx
import { CSSDReportingPage } from "@/modules/cssd-erp/contexts/reporting/entrypoint";

export const metadata = {
  title: "Báo cáo CSSD",
  description: "Một cửa báo cáo CSSD: vận hành, sự cố, sản lượng, bộ, máy, NV, trách nhiệm",
};

export default function Page() {
  return <CSSDReportingPage />;
}
