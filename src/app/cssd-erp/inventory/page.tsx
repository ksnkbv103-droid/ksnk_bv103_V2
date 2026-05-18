// src/app/cssd-erp/inventory/page.tsx
import { CSSDInstrumentInventoryPage } from "@/modules/cssd-erp/contexts/inventory-instrument/entrypoint";

export const metadata = {
  title: "Quản lý Kho Dụng cụ | KSNK 103",
  description: "Hệ thống giám sát tồn kho và tình trạng vật lý dụng cụ CSSD",
};

export default function Page() {
  return <CSSDInstrumentInventoryPage />;
}
