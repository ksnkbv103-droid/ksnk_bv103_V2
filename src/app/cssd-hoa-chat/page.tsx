import { CSSDChemicalInventoryPage } from "@/modules/cssd-erp/contexts/inventory-chemical/entrypoint";

export const metadata = {
  title: "Kho hóa chất & vật tư KSNK | BV103",
  description: "Tồn theo lô, nhập xuất và cảnh báo tồn",
};

export default function Page() {
  return <CSSDChemicalInventoryPage />;
}
