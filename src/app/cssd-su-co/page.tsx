import { Suspense } from "react";
import { CssdSuCoPage } from "@/modules/cssd-su-co/contexts/su-co/entrypoint";

export const metadata = {
  title: "Sự cố | KSNK 103",
  description: "Hỏng/Mất · sự cố quy trình · hóa chất · máy · khác. Luân chuyển số lượng nằm ở Dụng cụ.",
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
