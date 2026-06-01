import { redirect } from "next/navigation";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Phân quyền | BV103" };

/** Deep link cũ → tab Phân quyền trên hub Quản trị. */
export default function PhanQuyenRedirectPage() {
  redirect(quanTriHubHref("PHAN_QUYEN"));
}
