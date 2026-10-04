import { Metadata } from "next";
import BangKiemClient from "./BangKiemClient";

export const metadata: Metadata = {
  title: "Danh mục Bảng kiểm | KSNK BV103",
  description: "Quản lý mẫu bảng kiểm và tiêu chí giám sát",
};

export default function Page() {
  return <BangKiemClient />;
}
