import { Suspense } from "react";
import { CssdSuCoPage } from "@/modules/cssd-su-co/contexts/su-co/entrypoint";

export const metadata = {
  title: "Sự cố an toàn & biến động dụng cụ | KSNK 103",
  description: "Sự cố an toàn (QT/HC/máy) và 3 cửa biến động dụng cụ — Đổi danh mục · Hỏng/Mất · Chuyển.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Đang tải form…
        </div>
      }
    >
      <CssdSuCoPage />
    </Suspense>
  );
}
