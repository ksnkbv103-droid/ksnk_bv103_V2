import { redirect } from "next/navigation";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Dụng cụ thành phần | BV103" };

export default function DungCuChiTietRedirectPage() {
  redirect(quanTriDungCuHref("chi-tiet"));
}
