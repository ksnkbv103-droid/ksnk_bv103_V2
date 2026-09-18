import { Suspense } from "react";
import { CssdSuCoPage } from "@/modules/cssd-su-co/contexts/su-co/entrypoint";

export const metadata = {
  title: "Sự cố an toàn / Biến động dụng cụ | KSNK 103",
  description: "Hub An toàn (QT/HC/máy) và Biến động dụng cụ (Hỏng/Mất · Chuyển). Danh mục master qua Đề nghị danh mục.",
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
