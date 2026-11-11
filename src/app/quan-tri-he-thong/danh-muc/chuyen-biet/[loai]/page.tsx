import GenericDmMasterPage from "@/components/master-data/generic-dm/GenericDmMasterPage";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { canAccessDanhMucModuleRoute } from "@/lib/auth/quan-tri-access";
import { resolveDanhMucViewModuleByType } from "@/lib/master-data/danh-muc-permission-map";
import QuanTriAccessDenied from "@/components/shared/QuanTriAccessDenied";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(props: {
  params: Promise<{ loai: string }>;
}): Promise<Metadata> {
  const { loai } = await props.params;
  return {
    title: `Danh mục ${decodeURIComponent(loai)}`,
    description: "Quản lý danh mục master dm_* theo registry",
  };
}

export default async function Page(props: { params: Promise<{ loai: string }> }) {
  const { loai } = await props.params;
  const decoded = decodeURIComponent(loai);
  /* AR-8e/8f: trang chuyên dụng hoặc danh mục đã về module sở hữu → chuyển hướng. */
  const canonical = getDanhMucAdminPath(decoded);
  if (!canonical.startsWith("/quan-tri-he-thong/danh-muc/chuyen-biet/")) redirect(canonical);

  const allowed = await canAccessDanhMucModuleRoute(resolveDanhMucViewModuleByType(decoded));
  if (!allowed) {
    return (
      <QuanTriAccessDenied detail="Cần quyền xem danh mục hoặc vai trò quản trị để mở trang này." />
    );
  }

  return <GenericDmMasterPage loaiDanhMuc={decoded} />;
}
