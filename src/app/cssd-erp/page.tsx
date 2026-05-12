// src/app/cssd-erp/page.tsx
import CSSDERPPage from "@/modules/cssd-erp/views/CSSDERPPage";

export const metadata = {
  title: "CSSD ERP - Quản trị Tiệt khuẩn | KSNK 103",
  description: "Hệ thống quản trị tiệt khuẩn trung tâm, truy vết dụng cụ qua mã QR.",
};

export default function Page() {
  return <CSSDERPPage />;
}
