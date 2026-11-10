// src/app/quan-tri-he-thong/danh-muc/thiet-bi/page.tsx
import { redirect } from "next/navigation";

/** Danh mục thiết bị đã chuyển vào tab «Quản lý» của /cssd-thiet-bi (AR-5b). */
export default function Page() {
  redirect("/cssd-thiet-bi?tab=quan-ly");
}
