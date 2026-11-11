import { redirectWithQuery } from "@/lib/nav/redirect-with-query";
import { TO_CHUC_KHOA_PHONG_PATH } from "@/lib/master-data/quan-tri-paths";

/** AR-8e: Khoa phòng chuyển sang module Tổ chức. */
export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirectWithQuery(TO_CHUC_KHOA_PHONG_PATH, await props.searchParams);
}
