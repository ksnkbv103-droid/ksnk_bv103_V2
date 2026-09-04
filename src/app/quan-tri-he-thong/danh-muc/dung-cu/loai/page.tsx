import { redirect } from "next/navigation";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Danh mục Loại dụng cụ | BV103" };

/** Deep link cũ → sheet Loại (phụ, ADMIN) trên trang dụng cụ thống nhất. */
export default function LoaiDungCuRedirectPage() {
  redirect(quanTriDungCuHref("loai"));
}
