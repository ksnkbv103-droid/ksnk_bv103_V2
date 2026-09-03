import GenericDmMasterPage from "@/modules/quan-tri-he-thong/danh-muc/views/GenericDmMasterPage";
import { getDedicatedDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(props: {
  params: Promise<{ loai: string }>;
}): Promise<Metadata> {
  const { loai } = await props.params;
  return {
    title: `Danh mục ${decodeURIComponent(loai)} | Quản trị | KSNK BV103`,
    description: "Quản lý danh mục master dm_* theo registry",
  };
}

export default async function Page(props: { params: Promise<{ loai: string }> }) {
  const { loai } = await props.params;
  const decoded = decodeURIComponent(loai);
  const dedicated = getDedicatedDanhMucAdminPath(decoded);
  if (dedicated) redirect(dedicated);
  return <GenericDmMasterPage loaiDanhMuc={decoded} />;
}
