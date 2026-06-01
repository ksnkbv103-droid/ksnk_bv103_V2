import { redirect } from "next/navigation";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Danh mục Bộ dụng cụ | BV103" };

export default function BoDungCuRedirectPage() {
  redirect(quanTriDungCuHref("bo"));
}
