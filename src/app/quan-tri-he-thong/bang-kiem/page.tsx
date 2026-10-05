import { Metadata } from "next";
import BangKiemClient from "./BangKiemClient";

export const metadata: Metadata = {
  title: "Bảng kiểm",
  description: "Quản lý mẫu bảng kiểm và tiêu chí giám sát",
};

export default function Page() {
  return <BangKiemClient />;
}
