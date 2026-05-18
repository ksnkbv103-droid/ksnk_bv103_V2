// src/app/cssd-erp/report/page.tsx
import { CSSDReportingPage } from "@/modules/cssd-erp/contexts/reporting/entrypoint";

export const metadata = {
  title: "Báo cáo Tổng hợp CSSD | KSNK 103",
  description: "Thống kê và phân tích hiệu suất tiệt khuẩn tại Khoa KSNK",
};

export default function Page() {
  return <CSSDReportingPage />;
}
