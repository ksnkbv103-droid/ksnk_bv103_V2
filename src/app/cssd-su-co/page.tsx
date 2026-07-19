import { Suspense } from "react";
import { CssdSuCoPage } from "@/modules/cssd-su-co/contexts/su-co/entrypoint";

export const metadata = {
  title: "Ghi nhận sự cố CSSD | KSNK 103",
  description: "Báo cáo sự cố quy trình vô khuẩn — rollback theo chính sách BV103.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          Đang tải form sự cố…
        </div>
      }
    >
      <CssdSuCoPage />
    </Suspense>
  );
}
