// src/app/cssd-erp/batch/page.tsx
// Refactored: Moved to top-level navigation, but keeping this route for backward compatibility.
import { CSSDSterilizationBatchPage } from "@/modules/cssd-erp/contexts/sterilization-batch/entrypoint";


export const metadata = {
  title: "Quản lý Mẻ tiệt khuẩn | KSNK 103",
  description: "Hệ thống quản lý thông số kỹ thuật mẻ tiệt khuẩn CSSD",
};

export default function Page() {
  return <CSSDSterilizationBatchPage />;
}
