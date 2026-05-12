// src/app/cssd-erp/report/page.tsx
import CSSDReportPage from "@/modules/cssd-erp/views/CSSDReportPage";

export const metadata = {
  title: "Báo cáo Tổng hợp CSSD | KSNK 103",
  description: "Thống kê và phân tích hiệu suất tiệt khuẩn tại Khoa KSNK",
};

export default function Page() {
  return <CSSDReportPage />;
}
