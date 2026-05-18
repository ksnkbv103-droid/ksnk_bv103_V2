import { CssdSuCoPage } from "@/modules/cssd-su-co/contexts/su-co/entrypoint";

export const metadata = {
  title: "Ghi nhận sự cố CSSD | KSNK 103",
  description: "Báo cáo sự cố quy trình vô khuẩn — rollback theo chính sách BV103.",
};

export default function Page() {
  return <CssdSuCoPage />;
}
