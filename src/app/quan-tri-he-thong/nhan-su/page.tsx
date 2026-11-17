import { redirectWithQuery } from "@/lib/nav/redirect-with-query";
import { TO_CHUC_NHAN_SU_PATH } from "@/lib/master-data/quan-tri-paths";

/** AR-8e: Nhân sự chuyển sang module Tổ chức — giữ query (`?pending=1`, `?chuaTk=1`). */
export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirectWithQuery(TO_CHUC_NHAN_SU_PATH, await props.searchParams);
}
