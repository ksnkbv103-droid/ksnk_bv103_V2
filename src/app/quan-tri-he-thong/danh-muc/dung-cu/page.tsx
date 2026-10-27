import { redirect } from "next/navigation";
import { parseDungCuLayer, quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

export const metadata = { title: "Dụng cụ" };

/** Route cũ — quản lý dụng cụ đã chuyển sang màn CSSD; giữ redirect cho bookmark. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; sheet?: string }> }) {
  const { tab, sheet } = await searchParams;
  redirect(quanTriDungCuHref(parseDungCuLayer(tab, sheet)));
}
