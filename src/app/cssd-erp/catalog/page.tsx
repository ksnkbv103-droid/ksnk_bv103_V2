import { CSSDInstrumentCatalogPage } from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";

export const metadata = {
  title: "Danh mục CSSD liên thông | KSNK 103",
  description: "Bộ dụng cụ, dụng cụ chi tiết và loại dụng cụ liên thông trong một màn CSSD.",
};

export default function Page() {
  return <CSSDInstrumentCatalogPage />;
}
