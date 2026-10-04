import { redirect } from "next/navigation";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Dụng cụ" };

/** Deep link cũ → tab Bộ (thành phần nằm trong bộ). */
export default function DungCuChiTietRedirectPage() {
  redirect(quanTriDungCuHref("bo"));
}
