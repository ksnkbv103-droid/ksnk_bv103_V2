import { redirect } from "next/navigation";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Dụng cụ" };

export default function BoDungCuRedirectPage() {
  redirect(quanTriDungCuHref("bo"));
}
