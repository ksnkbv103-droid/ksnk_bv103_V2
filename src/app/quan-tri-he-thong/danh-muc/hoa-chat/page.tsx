// src/app/quan-tri-he-thong/danh-muc/hoa-chat/page.tsx
import { redirect } from "next/navigation";

/** Danh mục hóa chất đã chuyển vào tab «Danh mục» của /cssd-hoa-chat (HC-B). */
export default function Page() {
  redirect("/cssd-hoa-chat?tab=danh-muc");
}
